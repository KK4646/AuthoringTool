import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { z } from "zod";
import { loadLayout } from "@/lib/slides/layout";
import type { Deck, ResearchRequest, Section, Source } from "@/lib/slides/types";

const MODEL = "claude-opus-5-5";
// 安全判定で断られた場合に、サーバー側で別モデルへ自動で切り替える設定
const FALLBACK_BETA = "server-side-fallback-2026-07-01";
// 検索が長引いて一時停止（pause_turn）したときに再開する上限回数
const MAX_CONTINUATIONS = 3;

// APIキーはサーバー側だけで読む。NEXT_PUBLIC_ を付けないこと
function createAnthropic() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY が設定されていません。");
  return new Anthropic({ apiKey });
}

// 中項目1つについてWeb検索し、メモと出典を返す
async function researchSection(
  title: string,
  section: string,
): Promise<{ notes: string; sources: Source[] }> {
  const client = createAnthropic();
  const messages: BetaMessageParam[] = [
    {
      role: "user",
      content: `プレゼン資料「${title}」の中項目「${section}」について、Web検索で調べてください。
スライドに載せるための要点を日本語でまとめてください。
- 具体的な事実・数値・年を優先し、信頼できる情報源（公的機関・論文・大手報道など）を使う
- 情報が古い可能性があるものは時点を明記する
- 箇条書きで、10項目程度まで`,
    },
  ];

  const send = () =>
    client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "medium" },
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 4 }],
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
    throw new Error(`「${section}」のリサーチがAIに断られました。表現を変えて試してください。`);
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
  section: string,
  notes: string,
): Promise<string[]> {
  const { maxBullets, maxCharsPerBullet } = loadLayout().content;
  const schema = z.object({ bullets: z.array(z.string()) });
  const client = createAnthropic();

  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium", format: betaZodOutputFormat(schema) },
    messages: [
      {
        role: "user",
        content: `プレゼン資料「${title}」の中項目「${section}」のスライド本文を作ります。
次のリサーチメモをもとに、箇条書きを作ってください。
- ${maxBullets}項目以内
- 1項目あたり全角${maxCharsPerBullet}文字以内（スライドの枠に収めるため厳守）
- 体言止めなどで簡潔に。メモにない情報は加えない

<notes>
${notes}
</notes>`,
      },
    ],
    betas: [FALLBACK_BETA],
    fallbacks: "default",
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error(`「${section}」の箇条書きを作れませんでした。もう一度試してください。`);
  }
  return response.parsed_output.bullets.slice(0, maxBullets);
}

async function buildSection(title: string, section: string): Promise<Section> {
  const { notes, sources } = await researchSection(title, section);
  const bullets = await toBullets(title, section, notes);
  return { heading: section, bullets, sources };
}

// 中項目ごとのリサーチを並行して実行し、スライド全体の内容を作る
export async function researchDeck(req: ResearchRequest): Promise<Deck> {
  const sections = await Promise.all(
    req.sections.map((s) => buildSection(req.title, s)),
  );
  return { title: req.title, subtitle: req.subtitle, sections };
}
