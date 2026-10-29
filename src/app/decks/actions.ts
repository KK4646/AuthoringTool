"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { SectionSchema, type Section } from "@/lib/slides/types";

export async function deleteDeckAction(id: string) {
  await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from("decks").delete().eq("id", id);
  if (error) throw new Error("履歴の削除に失敗しました");
  revalidatePath("/decks");
}

/**
 * 履歴のスライド内容（中項目・小項目の置き方と中身）を保存し直す。詳細画面で置き方を変えたときに使う。
 * 失敗は例外ではなく { error } で返し、画面にそのまま出す。
 */
export async function updateDeckSectionsAction(
  id: string,
  sections: Section[],
): Promise<{ error?: string }> {
  const parsed = z.array(SectionSchema).safeParse(sections);
  if (!parsed.success) return { error: "スライドの内容が不正です。" };

  await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from("decks").update({ sections: parsed.data }).eq("id", id);
  if (error) return { error: "置き方の保存に失敗しました。" };
  revalidatePath(`/decks/${id}`);
  revalidatePath(`/edit/${id}`);
  return {};
}
