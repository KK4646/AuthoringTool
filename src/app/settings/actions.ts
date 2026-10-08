"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isApprovedColor } from "@/lib/colors";

export async function updateAccentColorAction(formData: FormData) {
  const color = String(formData.get("color") ?? "");
  // 8色パレット以外は無視する
  if (!isApprovedColor(color)) return;

  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("user_settings")
    .upsert({ user_id: user.id, accent_color: color }, { onConflict: "user_id" });
  if (error) throw new Error("テーマカラーの保存に失敗しました");

  // アクセント色は layout が読んでいるので layout ごと作り直す
  revalidatePath("/", "layout");
}
