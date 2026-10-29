import { z } from "zod";

// 出典1件
export const SourceSchema = z.object({
  title: z.string(),
  url: z.string(),
});

// 本文スライドの置き方（背景と文字枠の組み合わせ。config/layout.json の layouts のキー）
export const SLIDE_LAYOUTS = [
  "content",
  "content-no-heading",
  "title-only",
  "two-content",
  "comparison",
  "content-with-caption",
  "bubbles",
  "code",
  "diagram",
] as const;
export type SlideLayout = (typeof SLIDE_LAYOUTS)[number];

// 画面に出す置き方の名前（ユーザーの素材の名前に合わせる）
export const SLIDE_LAYOUT_LABELS: Record<SlideLayout, string> = {
  content: "1つのコンテンツ",
  "content-no-heading": "1つのコンテンツ(表題なし)",
  "title-only": "タイトルのみ",
  "two-content": "2つのコンテンツ",
  comparison: "比較",
  "content-with-caption": "タイトル付きのコンテンツ",
  bubbles: "吹き出しコンテンツ",
  code: "コード",
  diagram: "図解",
};

// 本文スライド1枚分の項目。layout が無ければ「1つのコンテンツ」（それより前の履歴には無い）。
// bullets は1段の箇条書き、2段の置き方では左の段。置き方で使わない項目は持っていても描かない
const slideFields = {
  heading: z.string(),
  bullets: z.array(z.string()),
  sources: z.array(SourceSchema),
  // 知らない値（将来足した置き方など）は無いものとして読み、履歴全体を壊さない
  layout: z.enum(SLIDE_LAYOUTS).optional().catch(undefined),
  right: z.array(z.string()).optional(), // 2段の置き方の右の段
  leftLabel: z.string().optional(), // 比較の左の小見出し
  rightLabel: z.string().optional(), // 比較の右の小見出し
  caption: z.string().optional(), // タイトル付きのコンテンツの左の説明文
  bubbles: z.array(z.string()).optional(), // 吹き出しの文（[大きい吹き出し, 小さい吹き出し]）
  code: z.string().optional(), // コードの置き方のコード（改行・字下げをそのまま保つ）
  diagram: z.string().optional(), // 図解の置き方の Mermaid の記法（描いた画像は diagram.ts の置き場所に保存する）
};

// 小項目1つ分のスライド内容（本文スライド1枚）
export const SubsectionSchema = z.object(slideFields);

// 中項目1つ分のスライド内容。
// 小項目があれば中項目は区切りのスライドになり、小項目ごとに本文スライドを作る（bullets / sources は空）。
// 小項目が無ければ今までどおり中項目1枚。subsections は後から足した項目なので、古い履歴には無い
export const SectionSchema = z.object({
  ...slideFields,
  subsections: z.array(SubsectionSchema).optional(),
});

// スライド全体。出典はスライドごとに分けず、全体で1つの一覧として持つ（2026-10-08 から）。
// それより前の履歴は中項目・小項目の sources に出典を持つので、読むときは allSources で合わせる
export const DeckSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  sections: z.array(SectionSchema),
  sources: z.array(SourceSchema).default([]),
});

export type Source = z.infer<typeof SourceSchema>;
export type Subsection = z.infer<typeof SubsectionSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type Deck = z.infer<typeof DeckSchema>;

// 中項目と小項目の見出しだけの形（作成画面の入力・テンプレート）
export type Outline = { heading: string; subheadings: string[] };

// 本文スライドの枚数。小項目のある中項目は小項目の数、無ければ1枚
export function countContentSlides(outlines: Outline[]): number {
  return outlines.reduce((n, o) => n + Math.max(o.subheadings.length, 1), 0);
}

// 画面から送られてくる中項目・小項目の一覧。前後の空白を落とし、空欄は除いてから数える
export const OutlineListSchema = z
  .array(
    z.object({
      heading: z.string().trim(),
      subheadings: z.array(z.string().trim()).default([]),
    }),
  )
  .transform((list) =>
    list
      .filter((o) => o.heading !== "")
      .map((o) => ({ heading: o.heading, subheadings: o.subheadings.filter(Boolean) })),
  )
  .pipe(
    z
      .array(
        z.object({
          heading: z.string(),
          subheadings: z.array(z.string()),
        }),
      )
      .min(1, "中項目を1つ以上入力してください"),
  );

// 画面から送られてくるリサーチ依頼
export const ResearchRequestSchema = z.object({
  title: z.string().trim().min(1, "タイトルを入力してください"),
  subtitle: z.string().trim().default(""),
  sections: OutlineListSchema,
});

export type ResearchRequest = z.infer<typeof ResearchRequestSchema>;

// DB の sections (jsonb) を検証して読む。形が崩れていたら空にする
export function parseSections(value: unknown): Section[] {
  const parsed = z.array(SectionSchema).safeParse(value);
  return parsed.success ? parsed.data : [];
}

// DB の sources (jsonb) を検証して読む。形が崩れていたら空にする
export function parseSources(value: unknown): Source[] {
  const parsed = z.array(SourceSchema).safeParse(value);
  return parsed.success ? parsed.data : [];
}

// 出典スライド・詳細画面に載せる出典の一覧。全体の出典に、古い履歴の中項目・小項目ごとの出典を
// 足し、URL の重複を除く
export function allSources(deck: Deck): Source[] {
  const list = [
    ...deck.sources,
    ...deck.sections.flatMap((sec) => [
      ...sec.sources,
      ...(sec.subsections ?? []).flatMap((sub) => sub.sources),
    ]),
  ];
  return [...new Map(list.map((src) => [src.url, src])).values()];
}
