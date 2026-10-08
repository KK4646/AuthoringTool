"use client";

import { useTransition } from "react";
import { HUES } from "@/lib/colors";

/**
 * テーマカラー(8色)の選択。押すとその場で保存する。
 * 保存するサーバーアクションの置き場所がアプリごとに違うので、action で受け取る。
 */
export function AccentColorPicker({
  current,
  action,
}: {
  current: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  function select(hex: string) {
    const formData = new FormData();
    formData.set("color", hex);
    startTransition(async () => {
      await action(formData);
    });
  }

  return (
    // w-fit で列幅を中身(色の丸＋ラベル)に合わせる。付けないと親いっぱいに
    // 4等分され、PCでは1つ200px超の箱になってしまう
    <div className="grid w-fit grid-cols-4 gap-3">
      {HUES.map((hue) => {
        const active = hue.hex === current;
        return (
          <button
            key={hue.hex}
            type="button"
            disabled={isPending}
            aria-pressed={active}
            onClick={() => select(hue.hex)}
            className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-xs font-medium transition-transform duration-150 ease-out active:scale-95 disabled:opacity-50 ${
              active
                ? "border-[var(--foreground)]"
                : "border-[var(--border)] hover:border-[var(--border-strong)]"
            }`}
          >
            <span
              className="h-8 w-8 rounded-full"
              style={{ backgroundColor: hue.hex }}
            />
            {hue.label}
          </button>
        );
      })}
    </div>
  );
}
