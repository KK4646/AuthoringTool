import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: "slideapp" },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component から呼ばれた場合はここで例外になるが、
            // middleware でセッションを更新していれば無視して問題ない
          }
        },
      },
    },
  );
}

/**
 * ログインユーザーを取得する。1回のページ描画(layout + page など複数箇所から呼ばれる)
 * につき1回だけに memo 化する。
 *
 * getUser() は毎回 Auth サーバーへ往復するので、JWT をローカルで検証する getClaims() を使う
 * (Supabase の JWT Signing Keys が有効なら往復なし。無効なら内部で getUser() に戻るだけ)。
 * 画面が使うのは id と email だけなのでその2つに絞って返す。
 */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: claims.email as string | undefined };
});
