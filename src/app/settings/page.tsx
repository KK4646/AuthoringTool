import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BackgroundPicker } from "@/components/BackgroundPicker";
import { getBackgroundPreviewUrls } from "@/lib/slides/backgrounds";

export default async function SettingsPage() {
  const user = await requireUser("/settings");
  const supabase = await createClient();
  const backgroundUrls = await getBackgroundPreviewUrls(supabase, user.id);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-8 px-4 py-6">
      <h1 className="text-xl font-bold">設定</h1>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">背景画像</h2>
        <p className="text-sm text-[var(--muted)]">
          16:9 の PNG / JPEG（5MB まで、例 1920×1080）。文字の位置・大きさ・色は config/layout.json で変えます（README 参照）。
        </p>
        <BackgroundPicker userId={user.id} uploadedUrls={backgroundUrls} />
      </section>

      <form action="/auth/signout" method="post">
        <button className="rounded-full border border-[var(--border)] px-4 py-2 text-sm transition-transform active:scale-95">
          ログアウト
        </button>
      </form>
    </main>
  );
}
