"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { deleteDeckAction } from "@/app/decks/actions";

type DeckSummary = { id: string; title: string; sectionCount: number; createdLabel: string };

/**
 * 履歴の一覧。普段は開くだけで、上の「編集」を押したときだけ各行に削除が出る
 * （誤タップで消さないため。共通ルール「削除など取り消せない操作は編集の奥に置く」）
 */
export function DeckList({ decks }: { decks: DeckSummary[] }) {
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState<DeckSummary | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function confirmDelete() {
    if (!target) return;
    const id = target.id;
    setTarget(null);
    setError("");
    startTransition(async () => {
      try {
        await deleteDeckAction(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "削除に失敗しました");
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setEditing((v) => !v)}
        className="w-fit self-end rounded-lg border border-[var(--border)] px-3 py-1 text-xs transition-transform hover:border-[var(--accent)] active:scale-95"
      >
        {editing ? "完了" : "編集"}
      </button>

      <ul className="flex flex-col gap-2">
        {decks.map((d) => (
          <li
            key={d.id}
            className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
          >
            <Link
              href={`/decks/${d.id}`}
              className="flex min-w-0 flex-1 flex-col transition-transform active:scale-[0.98]"
            >
              <span className="truncate text-sm font-medium">{d.title}</span>
              <span className="text-xs text-[var(--muted)]">
                {d.createdLabel}・中項目 {d.sectionCount}件
              </span>
            </Link>
            {editing && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => setTarget(d)}
                className="shrink-0 rounded-lg border border-red-600 px-3 py-1 text-xs text-red-600 transition-transform active:scale-95 disabled:opacity-50"
              >
                削除
              </button>
            )}
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {target && (
        <ConfirmDialog
          message={`「${target.title}」を履歴から削除しますか？元に戻せません。`}
          onConfirm={confirmDelete}
          onCancel={() => setTarget(null)}
        />
      )}
    </div>
  );
}
