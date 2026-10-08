import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // オープンリダイレクト防止のため、自サイト内のパスだけを next として受け付ける
  // ("@evil.com" や "//evil.com" を渡されると、origin に繋げたとき別サイトへ飛んでしまう)
  const rawNext = searchParams.get("next") ?? "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("セッションの確立に失敗しました", error);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
