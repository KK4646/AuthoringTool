import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DeckForm } from "@/components/DeckForm";
import { TemplateList } from "@/components/TemplateList";
import { listTemplates } from "@/lib/slides/templates";

export default async function HomePage() {
  await requireUser("/");
  const templates = await listTemplates(await createClient());

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold">スライドを作る</h1>
      </header>
      <DeckForm templates={templates} />

      {/* 設定タブを外したので、テンプレートの管理とログアウトはここに置く（2026-10-29、ユーザーの指示） */}
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">中項目のテンプレートの管理</h2>
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
