import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { OutlineListSchema, type Outline } from "@/lib/slides/types";

// テンプレート名の最大文字数（画面とサーバーで共通）
export const MAX_TEMPLATE_NAME = 30;

export type Template = { id: string; name: string; sections: Outline[] };

// 画面から送られてくる保存依頼。中項目・小項目の決まりはリサーチ依頼と同じ
export const SaveTemplateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "テンプレート名を入力してください")
    .max(MAX_TEMPLATE_NAME, `テンプレート名は${MAX_TEMPLATE_NAME}文字までにしてください`),
  sections: OutlineListSchema,
});

// DB の headings (jsonb) を検証して読む。形が崩れていたら空にする。
// 小項目を足す前に保存したものは文字列の配列（["中項目", ...]）なので、小項目なしとして読む
const StoredOutlineSchema = z.union([
  z.string().transform((heading) => ({ heading, subheadings: [] as string[] })),
  z.object({ heading: z.string(), subheadings: z.array(z.string()) }),
]);
export function parseTemplateSections(value: unknown): Outline[] {
  const parsed = z.array(StoredOutlineSchema).safeParse(value);
  return parsed.success ? parsed.data : [];
}

/** 本人のテンプレートを名前順で返す */
export async function listTemplates(
  supabase: SupabaseClient<Database, "slideapp">,
): Promise<Template[]> {
  const { data } = await supabase
    .from("templates")
    .select("id, name, headings")
    .order("name");
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    sections: parseTemplateSections(row.headings),
  }));
}
