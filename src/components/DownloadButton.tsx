"use client";

import { useState } from "react";
import { downloadPptx } from "@/lib/slides/download";
import type { Deck } from "@/lib/slides/types";

export function DownloadButton({ deck }: { deck: Deck }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setBusy(true);
    setError("");
    try {
      await downloadPptx(deck);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="w-fit rounded-full bg-[var(--accent)] px-5 py-2 text-sm text-[var(--accent-foreground)] transition-transform active:scale-95 disabled:opacity-50"
      >
        {busy ? "作成中…" : "pptxをダウンロード"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
