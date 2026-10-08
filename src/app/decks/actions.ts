"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function deleteDeckAction(id: string) {
  await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from("decks").delete().eq("id", id);
  if (error) throw new Error("履歴の削除に失敗しました");
  revalidatePath("/decks");
}
