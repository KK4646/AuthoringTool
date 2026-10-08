import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DownloadButton } from "@/components/DownloadButton";
import { jstDateString } from "@/lib/date";
import { parseSections, type Deck, type Subsection } from "@/lib/slides/types";

export default async function DeckPage({ params }: PageProps<"/decks/[id]">) {
  const { id } = await params;
  await requireUser(`/decks/${id}`);
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("decks")
    .select("title, subtitle, sections, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!row) notFound();

  const deck: Deck = {
    title: row.title,
    subtitle: row.subtitle,
    sections: parseSections(row.sections),
  };

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

      <DownloadButton deck={deck} />

      <div className="flex flex-col gap-3">
        {deck.sections.map((s, i) => (
          <article
            key={i}
            className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 shadow-[var(--shadow-card)]"
          >
            <h2 className="font-semibold">{s.heading}</h2>
            {s.subsections && s.subsections.length > 0 ? (
              s.subsections.map((sub, j) => (
                <div key={j} className="flex flex-col gap-2 border-l-2 border-[var(--border)] pl-3">
                  <h3 className="text-sm font-semibold">{sub.heading}</h3>
                  <SlideBody slide={sub} />
                </div>
              ))
            ) : (
              <SlideBody slide={s} />
            )}
          </article>
        ))}
      </div>
    </main>
  );
}

// 本文スライド1枚分（箇条書きと出典）
function SlideBody({ slide }: { slide: Subsection }) {
  return (
    <>
      <ul className="list-disc space-y-1 pl-5 text-sm">
        {slide.bullets.map((b, j) => (
          <li key={j}>{b}</li>
        ))}
      </ul>
      {slide.sources.length > 0 && (
        <details className="text-xs text-[var(--muted)]">
          <summary className="cursor-pointer">出典 {slide.sources.length}件</summary>
          <ul className="mt-1 space-y-1">
            {slide.sources.map((src) => (
              <li key={src.url}>
                <a className="underline" href={src.url} target="_blank" rel="noreferrer">
                  {src.title}
                </a>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
