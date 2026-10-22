import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DeckList } from "@/components/DeckList";
import { jstDateString, jstTimeString } from "@/lib/date";
import { parseSections } from "@/lib/slides/types";

export default async function DecksPage() {
  await requireUser("/decks");
  const supabase = await createClient();

  const { data } = await supabase
    .from("decks")
    .select("id, title, sections, created_at")
    .order("created_at", { ascending: false });

  const decks = (data ?? []).map((d) => ({
    id: d.id,
    title: d.title,
    sectionCount: parseSections(d.sections).length,
    createdLabel: `${jstDateString(d.created_at)} ${jstTimeString(d.created_at)}`,
  }));

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6">
      <h1 className="text-xl font-bold">履歴</h1>
      {decks.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">まだ作ったスライドはありません。</p>
      ) : (
        <DeckList decks={decks} />
      )}
    </main>
  );
}
