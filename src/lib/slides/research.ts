import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { z } from "zod";
import { loadLayout } from "@/lib/slides/layout";
import type { Deck, Outline, ResearchRequest, Section, Source, Subsection } from "@/lib/slides/types";

// API 料金を抑えるため、調べる部分は Sonnet、箇条書きに整える部分は Haiku を使う（2026-10-08）
const RESEARCH_MODEL = "claude-sonnet-5-5";
const BULLETS_MODEL = "claude-haiku-5-5";
// 安全判定で断られた場合に、サーバー側で別モデルへ自動で切り替える設定（Haiku には無い）
const FALLBACK_BETA = "server-side-fallback-2026-07-01";
// 1つの中項目で Web 検索する上限回数（1回ごとに課金され、結果も入力トークンになる）
const MAX_SEARCHES = 2;
// 検索が長引いて一時停止（pause_turn）したときに再開する上限回数
const MAX_CONTINUATIONS = 3;

// APIキーはサーバー側だけで読む。NEXT_PUBLIC_ を付けないこと
function createAnthropic() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY が設定されていません。");
  return new Anthropic({ apiKey });
}

// 本文スライド1枚分の話題（例: 中項目「A」、中項目「A」の小項目「B」）についてWeb検索し、メモと出典を返す
async function researchTopic(
  title: string,
  topic: string,
): Promise<{ notes: string; sources: Source[] }> {
  const client = createAnthropic();
  const messages: BetaMessageParam[] = [
    {
      role: "user",
      content: `プレゼン資料「${title}」の${topic}について、Web検索で調べてください。
スライドに載せるための要点を日本語でまとめてください。
- 具体的な事実・数値・年を優先し、信頼できる情報源（公的機関・論文・大手報道など）を使う
- 情報が古い可能性があるものは時点を明記する
- 箇条書きで、5項目程度まで`,
    },
  ];

  const send = () =>
    client.beta.messages.create({
      model: RESEARCH_MODEL,
      max_tokens: 16000,
      output_config: { effort: "low" },
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: MAX_SEARCHES }],
      messages,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
    });

  let response = await send();

  // 検索の途中で一時停止した場合は、そのまま送り返すと続きから再開される
  for (let i = 0; i < MAX_CONTINUATIONS && response.stop_reason === "pause_turn"; i++) {
    messages.push({ role: "assistant", content: response.content });
    response = await send();
  }

  if (response.stop_reason === "refusal") {
    throw new Error(`${topic}のリサーチがAIに断られました。表現を変えて試してください。`);
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

// リサーチのメモを、スライド用の短い箇条書きに整える
async function toBullets(
  title: string,
  topic: string,
  notes: string,
): Promise<string[]> {
  const { maxBullets, maxCharsPerBullet } = loadLayout().content;
  const schema = z.object({ bullets: z.array(z.string()) });
  const client = createAnthropic();

  const response = await client.beta.messages.parse({
    model: BULLETS_MODEL,
    max_tokens: 16000,
    output_config: { effort: "low", format: betaZodOutputFormat(schema) },
    messages: [
      {
        role: "user",
        content: `プレゼン資料「${title}」の${topic}のスライド本文を作ります。
次のリサーチメモをもとに、箇条書きを作ってください。
- ${maxBullets}項目以内
- 1項目あたり全角${maxCharsPerBullet}文字以内（スライドの枠に収めるため厳守）
- 体言止めなどで簡潔に。メモにない情報は加えない

<notes>
${notes}
</notes>`,
      },
    ],
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error(`${topic}の箇条書きを作れませんでした。もう一度試してください。`);
  }
  return response.parsed_output.bullets.slice(0, maxBullets);
}

// 本文スライド1枚分を作る（調べる → 箇条書きに整える）
async function buildSlide(title: string, topic: string, heading: string): Promise<Subsection> {
  const { notes, sources } = await researchTopic(title, topic);
  const bullets = await toBullets(title, topic, notes);
  return { heading, bullets, sources };
}

// 中項目1つ分を作る。小項目があれば小項目ごとに調べ、中項目そのものは調べない
async function buildSection(title: string, outline: Outline): Promise<Section> {
  const { heading, subheadings } = outline;
  if (subheadings.length === 0) {
    return buildSlide(title, `中項目「${heading}」`, heading);
  }
  const subsections = await Promise.all(
    subheadings.map((sub) => buildSlide(title, `中項目「${heading}」の小項目「${sub}」`, sub)),
  );
  return { heading, bullets: [], sources: [], subsections };
}

// 中項目（小項目）ごとのリサーチを並行して実行し、スライド全体の内容を作る
export async function researchDeck(req: ResearchRequest): Promise<Deck> {
  const sections = await Promise.all(
    req.sections.map((s) => buildSection(req.title, s)),
  );
  return { title: req.title, subtitle: req.subtitle, sections };
}
