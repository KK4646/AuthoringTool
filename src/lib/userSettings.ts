import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { DEFAULT_ACCENT_COLOR, type ApprovedColor } from "@/lib/colors";

/**
 * ユーザーのアクセントカラー設定を取得する。未設定ならデフォルト色を返す。
 */
export async function getAccentColor(
  supabase: SupabaseClient<Database, "slideapp">,
  userId: string,
): Promise<ApprovedColor> {
  const { data } = await supabase
    .from("user_settings")
    .select("accent_color")
    .eq("user_id", userId)
    .maybeSingle();

  return (data?.accent_color as ApprovedColor | undefined) ?? DEFAULT_ACCENT_COLOR;
}
