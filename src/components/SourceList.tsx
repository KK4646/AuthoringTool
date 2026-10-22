"use client";

import { useState } from "react";
import type { Source } from "@/lib/slides/types";

// 詳細画面の出典一覧。ボタンで開閉する（文字を押して開く <details> は使わない。2026-10-22 ユーザーの指示）
export function SourceList({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2 text-xs text-[var(--muted)]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-fit rounded-lg border border-[var(--border)] px-3 py-1 text-xs text-[var(--foreground)] transition-transform hover:border-[var(--accent)] active:scale-95"
      >
        {open ? "出典を隠す" : `出典を表示（${sources.length}件）`}
      </button>
      {open && (
        <ul className="space-y-1">
          {sources.map((src) => (
            <li key={src.url} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate">{src.title}</span>
              <a
                href={src.url}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 rounded-md border border-[var(--border)] px-2 py-0.5 text-[var(--foreground)] transition-transform active:scale-95"
              >
                開く
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
