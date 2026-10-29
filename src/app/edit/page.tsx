import { requireUser } from "@/lib/auth";
import { DeckList } from "@/components/DeckList";
import { listDeckSummaries } from "@/lib/slides/decks";

// 編集タブ。直す資料を選ぶ（作成が終わったときは、その資料の編集画面へ直接移る）
export default async function EditListPage() {
  await requireUser("/edit");
  const decks = await listDeckSummaries();

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-6">
      <h1 className="text-xl font-bold">編集</h1>
      {decks.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">まだ作ったスライドはありません。</p>
      ) : (
        <DeckList decks={decks} hrefBase="/edit" openLabel="編集" deletable={false} />
      )}
    </main>
  );
}
