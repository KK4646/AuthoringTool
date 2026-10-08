import { z } from "zod";

// 出典1件
export const SourceSchema = z.object({
  title: z.string(),
  url: z.string(),
});

// 小項目1つ分のスライド内容（本文スライド1枚）
export const SubsectionSchema = z.object({
  heading: z.string(),
  bullets: z.array(z.string()),
  sources: z.array(SourceSchema),
});

// 中項目1つ分のスライド内容。
// 小項目があれば中項目は区切りのスライドになり、小項目ごとに本文スライドを作る（bullets / sources は空）。
// 小項目が無ければ今までどおり中項目1枚。subsections は後から足した項目なので、古い履歴には無い
export const SectionSchema = z.object({
  heading: z.string(),
  bullets: z.array(z.string()),
  sources: z.array(SourceSchema),
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

// 中項目の最大数・1つの中項目の小項目の最大数（画面とサーバーで共通）
export const MAX_SECTIONS = 10;
export const MAX_SUBSECTIONS = 5;
// 本文スライドの合計の上限。リサーチのメモと箇条書きの量を抑え、API 料金と時間を抑えるため
export const MAX_CONTENT_SLIDES = 20;

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
          subheadings: z
            .array(z.string())
            .max(MAX_SUBSECTIONS, `小項目は1つの中項目につき${MAX_SUBSECTIONS}個までにしてください`),
        }),
      )
      .min(1, "中項目を1つ以上入力してください")
      .max(MAX_SECTIONS, `中項目は${MAX_SECTIONS}個までにしてください`)
      .refine(
        (list) => countContentSlides(list) <= MAX_CONTENT_SLIDES,
        `本文スライドは合計${MAX_CONTENT_SLIDES}枚までにしてください（小項目のある中項目は小項目の数で数えます）`,
      ),
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
