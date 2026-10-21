import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DeckSlides } from "@/components/DeckSlides";
import { jstDateString } from "@/lib/date";
import { loadLayout } from "@/lib/slides/layout";
import { allSources, parseSections, parseSources, type Deck } from "@/lib/slides/types";

export default async function DeckPage({ params }: PageProps<"/decks/[id]">) {
  const { id } = await params;
  await requireUser(`/decks/${id}`);
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("decks")
    .select("title, subtitle, sections, sources, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!row) notFound();

  const deck: Deck = {
    title: row.title,
    subtitle: row.subtitle,
    sections: parseSections(row.sections),
    sources: parseSources(row.sources),
  };
  const sources = allSources(deck);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6">
      <Link href="/decks" className="w-fit text-sm text-[var(--muted)] underline">
        ← 履歴へ
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold">{deck.title}</h1>
        {deck.subtitle && <p className="text-sm">{deck.subtitle}</p>}
        <p className="text-xs text-[var(--muted)]">{jstDateString(row.created_at)} 作成</p>
      </header>

      <DeckSlides id={id} initialDeck={deck} layout={loadLayout()} />

      {sources.length > 0 && (
        <details className="text-xs text-[var(--muted)]">
          <summary className="cursor-pointer">出典 {sources.length}件</summary>
          <ul className="mt-1 space-y-1">
            {sources.map((src) => (
              <li key={src.url}>
                <a className="underline" href={src.url} target="_blank" rel="noreferrer">
                  {src.title}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
    </main>
  );
}
