import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DeckForm } from "@/components/DeckForm";
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
    </main>
  );
}
