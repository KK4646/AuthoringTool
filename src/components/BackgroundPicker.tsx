"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  BACKGROUND_BUCKET,
  BACKGROUND_MAX_BYTES,
  BACKGROUND_MIME_TYPES,
  BACKGROUND_SLOTS,
  backgroundPath,
  type BackgroundSlot,
} from "@/lib/slides/backgrounds";

const SLOT_LABELS: Record<BackgroundSlot, string> = {
  title: "表紙",
  content: "目次・本文・出典",
};

// アップロードしていないときに使う既定の画像（config/layout.json の background と同じ）
const DEFAULT_IMAGES: Record<BackgroundSlot, string> = {
  title: "/backgrounds/title.png",
  content: "/backgrounds/content.png",
};

/**
 * 背景画像（表紙用・本文用）のアップロード。選ぶとその場で保存する。
 * 既定に戻す（削除）は「編集」の奥に置く。
 */
export function BackgroundPicker({
  userId,
  uploadedUrls,
}: {
  userId: string;
  uploadedUrls: Partial<Record<BackgroundSlot, string>>;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {BACKGROUND_SLOTS.map((slot) => (
        <BackgroundSlotRow
          key={slot}
          userId={userId}
          slot={slot}
          uploadedUrl={uploadedUrls[slot]}
        />
      ))}
    </ul>
  );
}

function BackgroundSlotRow({
  userId,
  slot,
  uploadedUrl,
}: {
  userId: string;
  slot: BackgroundSlot;
  uploadedUrl?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [isWorking, startWork] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function run(task: () => Promise<void>) {
    setError(null);
    startWork(async () => {
      try {
        await task();
        setEditing(false);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!BACKGROUND_MIME_TYPES.includes(file.type)) {
      setError("PNG か JPEG の画像を選んでください。");
      return;
    }
    if (file.size > BACKGROUND_MAX_BYTES) {
      setError("5MB 以下の画像を選んでください。");
      return;
    }
    run(async () => {
      const { error } = await createClient()
        .storage.from(BACKGROUND_BUCKET)
        .upload(backgroundPath(userId, slot), file, {
          upsert: true,
          contentType: file.type,
          cacheControl: "0",
        });
      if (error) throw new Error("画像の保存に失敗しました。");
    });
  }

  function resetToDefault() {
    setConfirming(false);
    run(async () => {
      const { error } = await createClient()
        .storage.from(BACKGROUND_BUCKET)
        .remove([backgroundPath(userId, slot)]);
      if (error) throw new Error("既定に戻せませんでした。");
    });
  }

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-[var(--border)] p-3">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 text-sm font-medium">
          {SLOT_LABELS[slot]}
          <span className="ml-2 text-xs font-normal text-[var(--muted)]">
            {uploadedUrl ? "アップロードした画像" : "既定の画像"}
          </span>
        </span>
        {!editing && uploadedUrl && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1 text-xs transition-transform hover:border-[var(--accent)] active:scale-95"
          >
            編集
          </button>
        )}
      </div>

      {/* 署名付きURL・既定画像のどちらも next/image の最適化対象にしないため img を使う */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={uploadedUrl ?? DEFAULT_IMAGES[slot]}
        alt={`${SLOT_LABELS[slot]}の背景`}
        className="aspect-video w-full rounded-md border border-[var(--border)] object-cover"
      />

      {editing ? (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setEditing(false)}
            disabled={isWorking}
            className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm transition-transform active:scale-95 disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={isWorking}
            className="rounded-full border border-red-600 px-4 py-1.5 text-sm text-red-600 transition-transform active:scale-95 disabled:opacity-50"
          >
            既定に戻す
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={BACKGROUND_MIME_TYPES.join(",")}
            className="hidden"
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = ""; // 同じファイルを選び直しても反応させる
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isWorking}
            className="w-fit rounded-full border border-[var(--border)] px-4 py-1.5 text-sm transition-transform active:scale-95 disabled:opacity-50"
          >
            {isWorking ? "保存中…" : "画像を選ぶ"}
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {confirming && (
        <ConfirmDialog
          message={`${SLOT_LABELS[slot]}の背景を既定の画像に戻しますか？アップロードした画像は消えます。`}
          confirmLabel="既定に戻す"
          onConfirm={resetToDefault}
          onCancel={() => setConfirming(false)}
        />
      )}
    </li>
  );
}
