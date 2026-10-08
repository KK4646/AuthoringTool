"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { APP_TITLE } from "@/lib/appInfo";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  // auth/callback がセッションを作れなかったとき、この印を付けて戻してくる
  const hasCallbackError = searchParams.get("error") === "auth_callback_failed";

  async function handleGoogleLogin() {
    setIsLoading(true);
    setErrorMessage(null);

    const supabase = createClient();
    const callbackUrl = new URL("/auth/callback", window.location.origin);
    if (next) callbackUrl.searchParams.set("next", next);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });

    if (error) {
      setErrorMessage("ログインに失敗しました。もう一度お試しください。");
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">{APP_TITLE}</h1>
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={isLoading}
        aria-busy={isLoading}
        className="rounded-full bg-[var(--accent)] px-6 py-3 font-medium text-[var(--accent-foreground)] shadow-[var(--shadow-card)] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isLoading ? "リダイレクト中..." : "Googleでログイン"}
      </button>
      {(errorMessage || hasCallbackError) && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {errorMessage ?? "ログインに失敗しました。もう一度お試しください。"}
        </p>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
