"use client";

import { useRef, useState } from "react";
import { EMPHASIS_COLORS, markRange, stripMarks, type EmphasisKey } from "@/lib/slides/emphasis";
import type { SlideLayout, Subsection } from "@/lib/slides/types";

const inputClass =
  "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]";

// 編集できる項目。bullets / right は1行1項目の複数行、bubbles は [大, 小] の2つ
type Field = "caption" | "leftLabel" | "bullets" | "rightLabel" | "right" | "bubbleLarge" | "bubbleSmall";

type Draft = Record<Field, string>;

function toDraft(slide: Subsection): Draft {
  return {
    caption: slide.caption ?? "",
    leftLabel: slide.leftLabel ?? "",
    bullets: slide.bullets.join("\n"),
    rightLabel: slide.rightLabel ?? "",
    right: (slide.right ?? []).join("\n"),
    bubbleLarge: slide.bubbles?.[0] ?? "",
    bubbleSmall: slide.bubbles?.[1] ?? "",
  };
}

const lines = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean);

// 編集内容をスライドに戻す。編集に出した項目だけ書き換え、置き方で使わない項目は持っていた値をそのまま残す
function fromDraft(slide: Subsection, d: Draft, fields: Field[]): Subsection {
  const has = (f: Field) => fields.includes(f);
  const text = (f: Field) => d[f].trim();
  return {
    ...slide,
    bullets: has("bullets") ? lines(d.bullets) : slide.bullets,
    right: has("right") ? lines(d.right) : slide.right,
    caption: has("caption") ? text("caption") : slide.caption,
    leftLabel: has("leftLabel") ? text("leftLabel") : slide.leftLabel,
    rightLabel: has("rightLabel") ? text("rightLabel") : slide.rightLabel,
    bubbles: has("bubbleLarge") ? [text("bubbleLarge"), text("bubbleSmall")] : slide.bubbles,
  };
}

// 置き方ごとに編集に出す項目
function fieldsFor(layout: SlideLayout): Field[] {
  switch (layout) {
    case "two-content":
      return ["bullets", "right"];
    case "comparison":
      return ["leftLabel", "bullets", "rightLabel", "right"];
    case "content-with-caption":
      return ["caption", "bullets"];
    case "bubbles":
      return ["bullets", "bubbleLarge", "bubbleSmall"];
    case "title-only":
      return [];
    default:
      return ["bullets"];
  }
}

const FIELD_LABELS: Record<Field, string> = {
  caption: "説明文",
  leftLabel: "左の小見出し",
  bullets: "箇条書き（1行1項目）",
  rightLabel: "右の小見出し",
  right: "右の段の箇条書き（1行1項目）",
  bubbleLarge: "大きい吹き出し",
  bubbleSmall: "小さい吹き出し",
};

const MULTILINE: Field[] = ["bullets", "right", "caption"];

/**
 * 本文スライド1枚の文字の編集。文字を選んで色のボタンを押すと、その部分に [[色|語]] の印が入り、
 * pptx と一覧ではその部分だけ色が変わる。
 */
export function SlideEditor({
  slide,
  onSave,
  onCancel,
}: {
  slide: Subsection;
  onSave: (next: Subsection) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(slide));
  // 最後に文字を選んだ欄と範囲（色のボタンを押すと欄からフォーカスが外れるので覚えておく）
  const selection = useRef<{ field: Field; start: number; end: number } | null>(null);
  const fields = fieldsFor(slide.layout ?? "content");

  function remember(field: Field, el: HTMLTextAreaElement | HTMLInputElement) {
    selection.current = { field, start: el.selectionStart ?? 0, end: el.selectionEnd ?? 0 };
  }

  // 選んだ範囲に色を付ける（key が無ければ外す）
  function apply(key?: EmphasisKey) {
    const sel = selection.current;
    if (!sel || sel.start === sel.end) return;
    const text = draft[sel.field];
    const next = key
      ? markRange(text, sel.start, sel.end, key)
      : text.slice(0, sel.start) + stripMarks(text.slice(sel.start, sel.end)) + text.slice(sel.end);
    setDraft({ ...draft, [sel.field]: next });
    selection.current = null;
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-[var(--border)] p-3">
      <p className="text-xs text-[var(--muted)]">色を付けたい文字を選んでから色を押す</p>
      <div className="flex flex-wrap items-center gap-2">
        {EMPHASIS_COLORS.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => apply(c.key)}
            className="flex items-center gap-1 rounded-full border border-[var(--border)] px-2.5 py-1 text-xs transition-transform active:scale-95"
          >
            <span className="inline-block h-3 w-3 rounded-full border border-black/20" style={{ background: `#${c.hex}` }} />
            {c.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => apply()}
          className="rounded-full border border-[var(--border)] px-2.5 py-1 text-xs transition-transform active:scale-95"
        >
          色を外す
        </button>
      </div>
      {fields.length === 0 && <p className="text-xs text-[var(--muted)]">この置き方には編集できる文字がありません</p>}
      {fields.map((field) => (
        <label key={field} className="flex flex-col gap-1 text-xs">
          <span>{FIELD_LABELS[field]}</span>
          {MULTILINE.includes(field) ? (
            <textarea
              className={inputClass}
              rows={field === "caption" ? 3 : 5}
              value={draft[field]}
              onChange={(e) => setDraft({ ...draft, [field]: e.target.value })}
              onSelect={(e) => remember(field, e.currentTarget)}
              onBlur={(e) => remember(field, e.currentTarget)}
            />
          ) : (
            <input
              className={inputClass}
              value={draft[field]}
              onChange={(e) => setDraft({ ...draft, [field]: e.target.value })}
              onSelect={(e) => remember(field, e.currentTarget)}
              onBlur={(e) => remember(field, e.currentTarget)}
            />
          )}
        </label>
      ))}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onSave(fromDraft(slide, draft, fields))}
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
