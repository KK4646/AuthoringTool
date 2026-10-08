import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TemplateList } from "@/components/TemplateList";
import { listTemplates } from "@/lib/slides/templates";

export default async function SettingsPage() {
  await requireUser("/settings");
  const supabase = await createClient();
  const templates = await listTemplates(supabase);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-8 px-4 py-6">
      <h1 className="text-xl font-bold">設定</h1>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">中項目のテンプレート</h2>
        <TemplateList templates={templates} />
      </section>

      <form action="/auth/signout" method="post">
        <button className="rounded-full border border-[var(--border)] px-4 py-2 text-sm transition-transform active:scale-95">
          ログアウト
        </button>
      </form>
    </main>
  );
}
