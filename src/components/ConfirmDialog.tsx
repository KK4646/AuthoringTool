"use client";

/**
 * ブラウザ標準のconfirm()の代わりに使う、画面中央のポップアップ確認ダイアログ。
 */
export function ConfirmDialog({
  message,
  confirmLabel = "削除する",
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xs rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 shadow-lg"
      >
        <p className="mb-4 text-sm">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm transition-colors duration-150 ease-out hover:bg-[var(--accent)]/8"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full border border-red-600 bg-red-600 px-4 py-1.5 text-sm text-white transition-colors duration-150 ease-out hover:bg-red-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
