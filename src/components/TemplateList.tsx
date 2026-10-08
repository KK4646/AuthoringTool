"use client";

import { useState, useTransition } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { deleteTemplateAction } from "@/app/templates/actions";
import type { Template } from "@/lib/slides/templates";

/**
 * 中項目のテンプレートの一覧。普段は見るだけで、上の「編集」を押したときだけ各行に削除が出る
 * （誤タップで消さないため。共通ルール「削除など取り消せない操作は編集の奥に置く」）
 */
export function TemplateList({ templates }: { templates: Template[] }) {
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState<Template | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  if (templates.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        まだありません。作成画面の「中項目をテンプレートに保存」から作れます。
      </p>
    );
  }

  function confirmDelete() {
    if (!target) return;
    const id = target.id;
    setTarget(null);
    setError("");
    startTransition(async () => {
      try {
        await deleteTemplateAction(id);
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
        {templates.map((t) => (
          <li
            key={t.id}
            className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2"
          >
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{t.name}</span>
              <span className="truncate text-xs text-[var(--muted)]">
                {t.sections
                  .map((o) => (o.subheadings.length > 0 ? `${o.heading}（小項目${o.subheadings.length}）` : o.heading))
                  .join(" / ")}
              </span>
            </div>
            {editing && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => setTarget(t)}
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
          message={`テンプレート「${target.name}」を削除しますか？元に戻せません。`}
          onConfirm={confirmDelete}
          onCancel={() => setTarget(null)}
        />
      )}
    </div>
  );
}
