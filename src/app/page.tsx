import { requireUser } from "@/lib/auth";
import { DeckForm } from "@/components/DeckForm";

export default async function HomePage() {
  await requireUser("/");

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold">スライドを作る</h1>
        <p className="text-sm text-[var(--muted)]">
          中項目ごとにWeb検索して要点をまとめ、背景画像に合わせた .pptx にします。
        </p>
      </header>
      <DeckForm />
    </main>
  );
}
