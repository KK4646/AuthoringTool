import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAccentColor } from "@/lib/userSettings";
import { AccentColorPicker } from "@/components/AccentColorPicker";
import { updateAccentColorAction } from "@/app/settings/actions";

export default async function SettingsPage() {
  const user = await requireUser("/settings");
  const accentColor = await getAccentColor(await createClient(), user.id);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-8 px-4 py-6">
      <h1 className="text-xl font-bold">設定</h1>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">テーマカラー</h2>
        <AccentColorPicker current={accentColor} action={updateAccentColorAction} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">背景画像と文字の配置</h2>
        <p className="text-sm text-[var(--muted)]">
          背景画像は public/backgrounds/、文字の位置・大きさ・色は config/layout.json で変えます（README 参照）。
        </p>
      </section>

      <form action="/auth/signout" method="post">
        <button className="rounded-full border border-[var(--border)] px-4 py-2 text-sm transition-transform active:scale-95">
          ログアウト
        </button>
      </form>
    </main>
  );
}
