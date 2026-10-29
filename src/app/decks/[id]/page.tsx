import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { DeckSlides } from "@/components/DeckSlides";
import { SourceList } from "@/components/SourceList";
import { jstDateString } from "@/lib/date";
import { getDeck } from "@/lib/slides/decks";
import { loadLayout } from "@/lib/slides/layout";
import { allSources } from "@/lib/slides/types";

// 履歴の詳細。見るだけ（プレビューとダウンロード）。直すときは編集タブで開く
export default async function DeckPage({ params }: PageProps<"/decks/[id]">) {
  const { id } = await params;
  await requireUser(`/decks/${id}`);
  const found = await getDeck(id);
  if (!found) notFound();
  const { deck, createdAt } = found;
  const sources = allSources(deck);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6">
      <Link
        href="/decks"
        className="w-fit rounded-lg border border-[var(--border)] px-3 py-1 text-xs transition-transform hover:border-[var(--accent)] active:scale-95"
      >
        ← 履歴へ
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold">{deck.title}</h1>
        {deck.subtitle && <p className="text-sm">{deck.subtitle}</p>}
        <p className="text-xs text-[var(--muted)]">{jstDateString(createdAt)} 作成</p>
      </header>
      <Link
        href={`/edit/${id}`}
        className="w-fit rounded-full border border-[var(--accent)] px-4 py-1.5 text-sm text-[var(--accent)] transition-transform active:scale-95"
      >
        編集タブで開く
      </Link>

      <DeckSlides id={id} initialDeck={deck} layout={loadLayout()} readOnly />

      {sources.length > 0 && <SourceList sources={sources} />}
    </main>
  );
}
