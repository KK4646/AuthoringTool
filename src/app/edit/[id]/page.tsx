import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { DeckSlides } from "@/components/DeckSlides";
import { getDeck } from "@/lib/slides/decks";
import { loadLayout } from "@/lib/slides/layout";

// 編集タブの資料1件。置き方の変更・文字の手直し・ダウンロードはここでする
export default async function EditDeckPage({ params }: PageProps<"/edit/[id]">) {
  const { id } = await params;
  await requireUser(`/edit/${id}`);
  const found = await getDeck(id);
  if (!found) notFound();
  const { deck } = found;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6">
      <Link
        href="/edit"
        className="w-fit rounded-lg border border-[var(--border)] px-3 py-1 text-xs transition-transform hover:border-[var(--accent)] active:scale-95"
      >
        ← 編集の一覧へ
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold">{deck.title}</h1>
        {deck.subtitle && <p className="text-sm">{deck.subtitle}</p>}
      </header>

      <DeckSlides id={id} initialDeck={deck} layout={loadLayout()} />
    </main>
  );
}
