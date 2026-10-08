import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/server";

export type AuthUser = NonNullable<Awaited<ReturnType<typeof getAuthUser>>>;

/**
 * 認証ガード。未ログインならログイン画面へ飛ばす。
 * ログインが必要なページ・Server Action の先頭で必ず呼ぶ。
 */
export async function requireUser(next?: string): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) {
    redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  }
  return user;
}
