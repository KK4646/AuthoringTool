"use client";

import { useRef } from "react";
import { SlidePreview } from "@/components/SlidePreview";
import { colorSelection, readLines } from "@/lib/slides/editDom";
import { EMPHASIS_COLORS, type EmphasisKey } from "@/lib/slides/emphasis";
import type { ContentLayout } from "@/lib/slides/layout";
import { contentSlideItems, type BoxKey } from "@/lib/slides/render";
import type { Subsection } from "@/lib/slides/types";

/**
 * 本文スライド1枚の文字の編集。プレビューの文字枠がそのまま書き換えられ、文字を選んで色のボタンを押すと
 * その部分に色が付く。「保存」で枠の中身を読み戻して onSave に渡す（印の形は emphasis.ts）。
 */
export function SlideEditor({
  slide,
  layoutDef,
  onSave,
  onCancel,
}: {
  slide: Subsection;
  layoutDef: ContentLayout;
  onSave: (next: Subsection) => void;
  onCancel: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const rendered = {
    background: layoutDef.background,
    backgroundColor: layoutDef.backgroundColor,
    // 空の枠も出して書き込めるようにする
    items: contentSlideItems(layoutDef, slide, true),
  };

  function apply(key?: EmphasisKey) {
    if (root.current) colorSelection(root.current, key);
  }

  // 枠ごとの中身を読み戻してスライドの項目に戻す。置き方で使わない項目は持っていた値をそのまま残す
  function save() {
    const boxes = new Map<BoxKey, string[]>();
    root.current?.querySelectorAll<HTMLElement>("[data-key]").forEach((el) => {
      boxes.set(el.dataset.key as BoxKey, readLines(el));
    });
    const text = (key: BoxKey, fallback: string | undefined) =>
      boxes.has(key) ? boxes.get(key)!.join("\n") : fallback;
    const list = (key: BoxKey, fallback: string[] | undefined) => (boxes.has(key) ? boxes.get(key)! : fallback);
    const hasBubbles = boxes.has("bubbleLarge") || boxes.has("bubbleSmall");
    onSave({
      ...slide,
      heading: text("heading", slide.heading) ?? slide.heading,
      bullets: list("body", list("left", slide.bullets)) ?? [],
      right: list("right", slide.right),
      leftLabel: text("leftLabel", slide.leftLabel),
      rightLabel: text("rightLabel", slide.rightLabel),
      caption: text("caption", slide.caption),
      bubbles: hasBubbles
        ? [text("bubbleLarge", slide.bubbles?.[0]) ?? "", text("bubbleSmall", slide.bubbles?.[1]) ?? ""]
        : slide.bubbles,
      code: text("code", slide.code),
      diagram: text("diagram", slide.diagram),
    });
  }

  // 色のボタンは mousedown で文字の選択が消えないようにする
  const keepSelection = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {EMPHASIS_COLORS.map((c) => (
          <button
            key={c.key}
            type="button"
            onMouseDown={keepSelection}
            onClick={() => apply(c.key)}
            className="flex items-center gap-1 rounded-full border border-[var(--border)] px-2.5 py-1 text-xs transition-transform active:scale-95"
          >
            <span className="inline-block h-3 w-3 rounded-full border border-black/20" style={{ background: `#${c.hex}` }} />
            {c.label}
          </button>
        ))}
        <button
          type="button"
          onMouseDown={keepSelection}
          onClick={() => apply()}
          className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs transition-transform active:scale-95"
        >
          色を外す
        </button>
      </div>
      <SlidePreview slide={rendered} editing rootRef={root} />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          className="rounded-full bg-[var(--accent)] px-4 py-1.5 text-sm text-[var(--accent-foreground)] transition-transform active:scale-95"
        >
          保存
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-[var(--border)] px-4 py-1.5 text-sm transition-transform active:scale-95"
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
