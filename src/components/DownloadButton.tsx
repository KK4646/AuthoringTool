"use client";

import { useState } from "react";
import { downloadPptx } from "@/lib/slides/download";
import type { Layout } from "@/lib/slides/layout";
import type { Deck } from "@/lib/slides/types";

// beforeDownload は編集タブ用。保存が終わるのを待ち、保存できなかったら false を返してダウンロードを止める
export function DownloadButton({
  deck,
  layout,
  label = "pptxをダウンロード",
  disabled = false,
  beforeDownload,
}: {
  deck: Deck;
  layout?: Layout;
  label?: string;
  disabled?: boolean;
  beforeDownload?: () => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setBusy(true);
    setError("");
    try {
      if (beforeDownload && !(await beforeDownload())) return;
      await downloadPptx(deck, layout);
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
        disabled={busy || disabled}
        className="w-fit rounded-full bg-[var(--accent)] px-5 py-2 text-sm text-[var(--accent-foreground)] transition-transform active:scale-95 disabled:opacity-50"
      >
        {busy ? "作成中…" : label}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
