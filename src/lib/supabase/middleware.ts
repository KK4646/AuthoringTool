import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: "slideapp" },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // セッションのリフレッシュをトリガーするための呼び出し。getUser() だと毎回 Auth サーバーへ
  // 往復するので、JWT をローカルで検証する getClaims() にする(期限切れならここで更新される)
  await supabase.auth.getClaims();

  return supabaseResponse;
}
