"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SaveTemplateSchema } from "@/lib/slides/templates";

/**
 * 中項目をテンプレートとして保存する。同じ名前があれば上書きする（上書きの確認は画面側で出す）。
 * 入力の誤りは例外ではなく { error } で返し、画面にそのまま出す。
 */
export async function saveTemplateAction(
  name: string,
  headings: string[],
): Promise<{ error?: string }> {
  const parsed = SaveTemplateSchema.safeParse({ name, headings });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "入力が不正です。" };

  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("templates")
    .upsert(
      { user_id: user.id, name: parsed.data.name, headings: parsed.data.headings },
      { onConflict: "user_id,name" },
    );
  if (error) return { error: "テンプレートの保存に失敗しました。" };

  revalidatePath("/");
  revalidatePath("/settings");
  return {};
}

export async function deleteTemplateAction(id: string) {
  await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from("templates").delete().eq("id", id);
  if (error) throw new Error("テンプレートの削除に失敗しました");

  revalidatePath("/");
  revalidatePath("/settings");
}
