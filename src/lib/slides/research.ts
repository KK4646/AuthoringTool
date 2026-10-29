import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { z } from "zod";
import { loadLayout } from "@/lib/slides/layout";
import type { Deck, Outline, ResearchRequest, Section, Source, Subsection } from "@/lib/slides/types";

// API 料金を抑えるため、調べる部分は Sonnet、置き方を選んで本文に整える部分は Haiku を使う（2026-10-08）
const RESEARCH_MODEL = "claude-sonnet-5-5";
const BULLETS_MODEL = "claude-haiku-5-5";
// 安全判定で断られた場合に、サーバー側で別モデルへ自動で切り替える設定（Haiku には無い）
const FALLBACK_BETA = "server-side-fallback-2026-07-01";
// リサーチ全体で Web 検索する上限回数（1回ごとに課金され、結果も入力トークンになる）。
// 2026-10-08 にスライドごとの並行リサーチ（1枚2回まで）をやめ、全体で1回の依頼にまとめた
const MAX_SEARCHES = 5;

// AI の返事の長さの上限。スライドの枚数に合わせて増やし、返事が途中で切れないようにする
// （1枚あたりの量は目安。モデルの出力上限を超えないよう上で止める）
const TOKENS_PER_SLIDE = 1500;
const MIN_OUTPUT_TOKENS = 16000;
const MAX_OUTPUT_TOKENS = 64000;
function outputTokens(slideCount: number): number {
  return Math.min(MAX_OUTPUT_TOKENS, Math.max(MIN_OUTPUT_TOKENS, slideCount * TOKENS_PER_SLIDE));
}
// 返事の上限を大きくすると SDK が「長すぎる」と止めるので、待ち時間を明示する（本番の maxDuration と同じ300秒）
const REQUEST_OPTIONS = { timeout: 300_000 };
// 検索が長引いて一時停止（pause_turn）したときに再開する上限回数
const MAX_CONTINUATIONS = 3;

// APIキーはサーバー側だけで読む。NEXT_PUBLIC_ を付けないこと
function createAnthropic() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY が設定されていません。");
  return new Anthropic({ apiKey });
}

// 本文スライド1枚分の話題。topic は AI への説明用、heading はスライドの見出し
export type SlideTopic = { topic: string; heading: string };

// 中項目・小項目の一覧を、本文スライドの並び順の話題の一覧にする。
// 小項目があれば小項目ごとに1枚（中項目そのものは調べない）、無ければ中項目1枚
export function listSlideTopics(outlines: Outline[]): SlideTopic[] {
  return outlines.flatMap(({ heading, subheadings }) =>
    subheadings.length === 0
      ? [{ topic: `中項目「${heading}」`, heading }]
      : subheadings.map((sub) => ({ topic: `中項目「${heading}」の小項目「${sub}」`, heading: sub })),
  );
}

// AI に渡す話題の一覧（番号付き）
function numberedTopics(topics: SlideTopic[]): string {
  return topics.map((t, i) => `${i + 1}. ${t.topic}`).join("\n");
}

// 全スライド分の話題を1回の依頼でまとめてWeb検索し、スライドごとに区切ったメモと出典を返す
async function researchAll(
  title: string,
  topics: SlideTopic[],
): Promise<{ notes: string; sources: Source[] }> {
  const client = createAnthropic();
  const messages: BetaMessageParam[] = [
    {
      role: "user",
      content: `プレゼン資料「${title}」の本文スライドに載せる内容を、Web検索で調べてください。
本文スライドは次の${topics.length}枚です。

${numberedTopics(topics)}

- Web検索は${MAX_SEARCHES}回までです。複数のスライドに使える情報源をまとめて探してください
- スライドごとに「【スライド番号】」の見出しを付け、要点を日本語の箇条書き（5項目程度まで）でまとめる
- 具体的な事実・数値・年を優先し、信頼できる情報源（公的機関・論文・大手報道など）を使う
- 情報が古い可能性があるものは時点を明記する
- プログラミングなどコードで示すと分かりやすい話題は、短いコード例もメモに含める
- 手順・流れ・仕組み・原因と結果・時系列の変化がある話題は、図にできるよう、段階や要素とそのつながりを
  「A → B → C」の形でもメモに含める`,
    },
  ];

  const send = () =>
    client.beta.messages.create({
      model: RESEARCH_MODEL,
      max_tokens: outputTokens(topics.length),
      output_config: { effort: "low" },
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: MAX_SEARCHES }],
      messages,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
    }, REQUEST_OPTIONS);

  let response = await send();

  // 検索の途中で一時停止した場合は、そのまま送り返すと続きから再開される
  for (let i = 0; i < MAX_CONTINUATIONS && response.stop_reason === "pause_turn"; i++) {
    messages.push({ role: "assistant", content: response.content });
    response = await send();
  }

  if (response.stop_reason === "refusal") {
    throw new Error("リサーチがAIに断られました。表現を変えて試してください。");
  }

  // 本文と、本文が引用した出典URLを集める（重複は除く）
  let notes = "";
  const sources = new Map<string, Source>();
  for (const block of response.content) {
    if (block.type !== "text") continue;
    notes += block.text;
    for (const c of block.citations ?? []) {
      if (c.type === "web_search_result_location" && !sources.has(c.url)) {
        sources.set(c.url, { title: c.title ?? c.url, url: c.url });
      }
    }
  }

  return { notes, sources: [...sources.values()] };
}

// AI が選んでよい本文の置き方。タイトルのみ・表題なしは調べた中身が載らないので、
// 詳細画面で手で選ぶ用にする
export const AI_LAYOUTS = [
  "content",
  "two-content",
  "comparison",
  "content-with-caption",
  "bubbles",
  "code",
  "diagram",
  "content-diagram",
  "content-code-diagram",
] as const;
type AiLayout = (typeof AI_LAYOUTS)[number];

// AI が返す本文スライド1枚分。構造化出力で扱いやすいよう、使わない項目も空で必ず返させる
type ComposedSlide = {
  layout: AiLayout;
  bullets: string[];
  right: string[];
  leftLabel: string;
  rightLabel: string;
  caption: string;
  bubbles: string[];
  code: string;
  diagram: string;
};

// normalizeSlide で切りそろえる上限（config/layout.json の content）
type SlideLimits = { maxBullets: number; maxCodeBullets: number; maxCodeLines: number; maxComboCodeLines: number };

// 本文スライドの見出し・出典以外の中身
export type SlideBody = Omit<Subsection, "heading" | "sources">;

// AI の返した1枚を、置き方に必要な項目がそろった形に直す。足りなければ1つのコンテンツに戻し、
// 置き方で使わない項目は捨てる
export function normalizeSlide(raw: ComposedSlide, limits: SlideLimits): SlideBody {
  const { maxBullets } = limits;
  const clean = (list: string[]) =>
    list.map((t) => t.trim()).filter(Boolean).slice(0, maxBullets);
  const bullets = clean(raw.bullets);
  const right = clean(raw.right);
  const leftLabel = raw.leftLabel.trim();
  const rightLabel = raw.rightLabel.trim();
  const caption = raw.caption.trim();
  const bubbles = raw.bubbles.map((t) => t.trim()).filter(Boolean).slice(0, 2);
  // コードは字下げを保つため行頭の空白は残し、前後の空行と行末の空白だけ落とす
  const code = raw.code
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/^\n+|\n+$/g, "")
    .split("\n")
    .slice(0, limits.maxCodeLines)
    .join("\n");
  const diagram = raw.diagram.trim();

  switch (raw.layout) {
    case "comparison":
      if (right.length > 0 && leftLabel && rightLabel) {
        return { layout: "comparison", leftLabel, bullets, rightLabel, right };
      }
      if (right.length > 0) return { layout: "two-content", bullets, right };
      break;
    case "two-content":
      if (right.length > 0) return { layout: "two-content", bullets, right };
      break;
    case "content-with-caption":
      if (caption) return { layout: "content-with-caption", caption, bullets };
      break;
    case "bubbles":
      if (bubbles.length > 0) return { layout: "bubbles", bullets, bubbles };
      break;
    case "code":
      if (code) return { layout: "code", bullets: bullets.slice(0, limits.maxCodeBullets), code };
      break;
    case "diagram":
      if (diagram) return { layout: "diagram", bullets: bullets.slice(0, limits.maxCodeBullets), diagram };
      break;
    case "content-diagram":
      if (diagram) return { layout: "content-diagram", bullets, diagram };
      break;
    case "content-code-diagram": {
      // コードか図の片方しか無ければ、ある方だけの置き方にする
      const short = code.split("\n").slice(0, limits.maxComboCodeLines).join("\n");
      const few = bullets.slice(0, limits.maxCodeBullets);
      if (code && diagram) return { layout: "content-code-diagram", bullets: few, code: short, diagram };
      if (diagram) return { layout: "content-diagram", bullets, diagram };
      if (code) return { layout: "code", bullets: few, code };
      break;
    }
  }
  return { layout: "content", bullets: [...bullets, ...right].slice(0, maxBullets) };
}

// リサーチのメモから、全スライド分の置き方と本文を1回の依頼で作る。戻り値は topics と同じ並び
async function composeSlides(
  title: string,
  topics: SlideTopic[],
  notes: string,
): Promise<SlideBody[]> {
  const limits = loadLayout().content;
  const schema = z.object({
    slides: z.array(
      z.object({
        number: z.number().int(),
        layout: z.enum(AI_LAYOUTS),
        bullets: z.array(z.string()),
        right: z.array(z.string()),
        leftLabel: z.string(),
        rightLabel: z.string(),
        caption: z.string(),
        bubbles: z.array(z.string()),
        code: z.string(),
        diagram: z.string(),
      }),
    ),
  });
  const client = createAnthropic();

  const response = await client.beta.messages.parse({
    model: BULLETS_MODEL,
    max_tokens: outputTokens(topics.length),
    output_config: { effort: "low", format: betaZodOutputFormat(schema) },
    messages: [
      {
        role: "user",
        content: `プレゼン資料「${title}」の本文スライド${topics.length}枚の本文を作ります。

${numberedTopics(topics)}

次のリサーチメモをもとに、スライドごとに置き方（layout）を選び、その置き方の項目を埋めてください。
number はスライド番号です。全${topics.length}枚すべてについて作ってください。

置き方の選び方（内容に合うものを選ぶ。迷ったら content）
- 後から手で直さなくて済むよう、次に当てはまるスライドは必ずその置き方にする
  - プログラミング・コマンド・設定ファイルなど、具体的な書き方を見せられる話題 → code
    （処理の流れや変化も図で見せられるなら content-code-diagram）
  - 手順・流れ・仕組み・原因と結果・時系列の変化など、段階やつながりを図で見せられる話題 → diagram か content-diagram
    （図の補足に要点を並べたいときは content-diagram）
  - ただし code・diagram・content-diagram・content-code-diagram を合わせて全体の半分までにする
- content: 見出し＋箇条書き1段。bullets に${limits.maxBullets}項目以内、1項目全角${limits.maxCharsPerBullet}文字以内
- two-content: 2つのまとまりを左右2段で並べる。bullets（左）と right（右）にそれぞれ${limits.maxBullets}項目以内、
  1項目全角${limits.maxCharsPerColumnBullet}文字以内
- comparison: 2つのものを比べる話題（AとBの違い・長所と短所・昔と今など）。leftLabel / rightLabel に比べるものの名前
  （全角12文字以内）、bullets（左）と right（右）にそれぞれ${limits.maxBullets}項目以内、1項目全角${limits.maxCharsPerColumnBullet}文字以内
- content-with-caption: 用語や仕組みを短く説明してから要点を並べる。caption に説明文（全角${limits.maxCaptionChars}文字以内・文章）、
  bullets に${limits.maxBullets}項目以内、1項目全角${limits.maxCharsPerColumnBullet}文字以内
- bubbles: キャラクターがひとこと添えると分かりやすいもの（覚え方・注意点・まとめ）。全体の4枚に1枚程度まで。
  bullets に${limits.maxBullets}項目以内、1項目全角${limits.maxCharsPerColumnBullet}文字以内、
  bubbles に[大きい吹き出し（全角${limits.maxBubbleLargeChars}文字以内）, 小さい吹き出し（全角${limits.maxBubbleSmallChars}文字以内）]の2つ
- code: コード例を見せるスライド。bullets に${limits.maxCodeBullets}項目以内の短い説明（1項目全角${limits.maxCharsPerBullet}文字以内）、
  code にコード（${limits.maxCodeLines}行以内・1行半角${limits.maxCodeLineChars}文字以内。改行と字下げはそのまま。説明は // などのコメントで短く）
- diagram: 流れ・手順・仕組み・関係を図で見せると分かりやすいもの。左に短い説明、右に図を大きく見せる。
  bullets に${limits.maxCodeBullets}項目以内の短い説明（1項目全角${limits.maxCharsPerColumnBullet}文字以内）、diagram に図の記法
- content-diagram: 左に要点の箇条書き、右に図。bullets に${limits.maxBullets}項目以内、1項目全角${limits.maxCharsPerColumnBullet}文字以内、
  diagram に図の記法（右の枠は縦長に近いので、flowchart なら TD にする）
- content-code-diagram: プログラミングの話題で、仕組みの図と実際のコードの両方があると分かりやすいもの。左上に要点、左下にコード、右に図。
  bullets に${limits.maxCodeBullets}項目以内（1項目全角${limits.maxCharsPerColumnBullet}文字以内）、
  code に図と同じ内容を表す短いコード（${limits.maxComboCodeLines}行以内・1行半角${limits.maxComboCodeLineChars}文字以内）、diagram に図の記法
- 図の記法（diagram・content-diagram・content-code-diagram の diagram）は Mermaid。内容に最も合う種類を次から選ぶ
  - 手順・流れ・仕組み・原因と結果 → flowchart（1行目は "flowchart TD" か "flowchart LR"）。ノードは A["文字"] のように必ず "" で囲む。
    矢印の文字は付けないか短く（A -->|"文字"| B の形で、必ず "" で囲む）。一直線に並ぶノードは6個まで（LR なら4個まで）にし、それより多い流れは
    段階をまとめる（長すぎると図が小さくなるため）
  - 図の形を一本道に決めつけず、中身の関係に合う形にする。分かれ道（条件で分かれる）・合流・繰り返し（最後から最初へ戻る矢印）・
    親子の階層（1つの箱から複数の箱へ）・グループ分け（subgraph でまとめる）など。ノードの形も役割で変えてよい
    （判断は B{"文字"}、始まりと終わりは A(["文字"])、データは C[("文字")]）
  - 同じ資料の中で、同じ種類・同じ形の図を続けない
  - 年や時期ごとの出来事 → timeline（1行目は "timeline"、次の行から "    2017 : 出来事"）
  - 1つのテーマから広がる要素・分類 → mindmap（1行目は "mindmap"、次の行に "  root((テーマ))"、要素は字下げで階層を表す）
  - 人やシステムの間のやり取りの順番 → sequenceDiagram（1行目は "sequenceDiagram"、"    A->>B: 文字" の形）
  - どの種類でも、要素は${limits.maxDiagramNodes}個以内、1つの要素の文字は全角${limits.maxDiagramNodeChars}文字以内
- 選んだ置き方で使わない項目は空（"" や []）にする

書き方
- 文字数は枠に収めるため厳守。体言止めなどで簡潔に
- コードや記号の並び（{ } ; = + - など）を、箇条書き・説明文・吹き出しに書かない。コードを見せたいときは
  code の置き方を選んで code に書く。他の置き方では、コードの意味を日本語で説明する
- メモにない情報は加えない

<notes>
${notes}
</notes>`,
      },
    ],
  }, REQUEST_OPTIONS);

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error("スライドの本文を作れませんでした。もう一度試してください。");
  }
  const byNumber = new Map(response.parsed_output.slides.map((s) => [s.number, s]));
  return topics.map((t, i) => {
    const slide = byNumber.get(i + 1);
    if (!slide) throw new Error(`${t.topic}の本文を作れませんでした。もう一度試してください。`);
    return normalizeSlide(slide, limits);
  });
}

// 本文スライドごとの中身（listSlideTopics と同じ並び）を、中項目・小項目の形に戻す
export function assembleSections(outlines: Outline[], bodies: SlideBody[]): Section[] {
  let i = 0;
  return outlines.map(({ heading, subheadings }) => {
    if (subheadings.length === 0) {
      return { heading, ...bodies[i++], sources: [] };
    }
    const subsections = subheadings.map((sub) => ({ heading: sub, ...bodies[i++], sources: [] }));
    return { heading, bullets: [], sources: [], subsections };
  });
}

// 全スライド分を1回で調べ、1回で置き方を選んで本文を作り、スライド全体の内容を作る。
// 出典はスライドごとに分けず、全体で1つの一覧にする
export async function researchDeck(req: ResearchRequest): Promise<Deck> {
  const topics = listSlideTopics(req.sections);
  const { notes, sources } = await researchAll(req.title, topics);
  const bodies = await composeSlides(req.title, topics, notes);
  return {
    title: req.title,
    subtitle: req.subtitle,
    sections: assembleSections(req.sections, bodies),
    sources,
  };
}
