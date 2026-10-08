import { z } from "zod";

// 出典1件
export const SourceSchema = z.object({
  title: z.string(),
  url: z.string(),
});

// 中項目1つ分のスライド内容
export const SectionSchema = z.object({
  heading: z.string(),
  bullets: z.array(z.string()),
  sources: z.array(SourceSchema),
});

// スライド全体
export const DeckSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  sections: z.array(SectionSchema),
});

export type Source = z.infer<typeof SourceSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type Deck = z.infer<typeof DeckSchema>;

// 中項目の最大数（画面とサーバーで共通）
export const MAX_SECTIONS = 10;

// 画面から送られてくるリサーチ依頼
export const ResearchRequestSchema = z.object({
  title: z.string().trim().min(1, "タイトルを入力してください"),
  subtitle: z.string().trim().default(""),
  sections: z
    .array(z.string().trim().min(1))
    .min(1, "中項目を1つ以上入力してください")
    .max(MAX_SECTIONS, `中項目は${MAX_SECTIONS}個までにしてください`),
});

export type ResearchRequest = z.infer<typeof ResearchRequestSchema>;

// DB の sections (jsonb) を検証して読む。形が崩れていたら空にする
export function parseSections(value: unknown): Section[] {
  const parsed = z.array(SectionSchema).safeParse(value);
  return parsed.success ? parsed.data : [];
}
