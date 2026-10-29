import { requireUser } from "@/lib/auth";
import { DeckList } from "@/components/DeckList";
import { listDeckSummaries } from "@/lib/slides/decks";

export default async function DecksPage() {
  await requireUser("/decks");
  const decks = await listDeckSummaries();

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
