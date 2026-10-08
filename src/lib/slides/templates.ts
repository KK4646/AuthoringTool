import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { MAX_SECTIONS } from "@/lib/slides/types";

// テンプレート名の最大文字数（画面とサーバーで共通）
export const MAX_TEMPLATE_NAME = 30;

export type Template = { id: string; name: string; headings: string[] };

// 画面から送られてくる保存依頼。中項目は空欄を除いてから数える
export const SaveTemplateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "テンプレート名を入力してください")
    .max(MAX_TEMPLATE_NAME, `テンプレート名は${MAX_TEMPLATE_NAME}文字までにしてください`),
  headings: z
    .array(z.string().trim())
    .transform((list) => list.filter(Boolean))
    .pipe(
      z
        .array(z.string())
        .min(1, "中項目を1つ以上入力してください")
        .max(MAX_SECTIONS, `中項目は${MAX_SECTIONS}個までにしてください`),
    ),
});

// DB の headings (jsonb) を検証して読む。形が崩れていたら空にする
export function parseHeadings(value: unknown): string[] {
  const parsed = z.array(z.string()).safeParse(value);
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
    headings: parseHeadings(row.headings),
  }));
}
