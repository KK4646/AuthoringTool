"use client";

import { useState } from "react";
import { updateDeckSectionsAction } from "@/app/decks/actions";
import { DownloadButton } from "@/components/DownloadButton";
import { OriginalDropdown } from "@/components/OriginalDropdown";
import { SlideEditor } from "@/components/SlideEditor";
import { changeLayout } from "@/lib/slides/changeLayout";
import { splitRuns } from "@/lib/slides/emphasis";
import {
  SLIDE_LAYOUT_LABELS,
  SLIDE_LAYOUTS,
  type Deck,
  type SlideLayout,
  type Subsection,
} from "@/lib/slides/types";

const LAYOUT_OPTIONS = SLIDE_LAYOUTS.map((value) => ({ value, label: SLIDE_LAYOUT_LABELS[value] }));

/**
 * 履歴の詳細画面のスライド一覧とダウンロード。本文スライドごとに置き方を変えられ（変えたらすぐ保存）、
 * 「編集」で文字の手直しと色付けができる（保存ボタンで保存）。ダウンロードは変えた後の内容で作る。
 */
export function DeckSlides({ id, initialDeck }: { id: string; initialDeck: Deck }) {
  const [deck, setDeck] = useState(initialDeck);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // i 番目の中項目（j があればその小項目）を update で置き換えて保存する
  async function updateSlide(update: (slide: Subsection) => Subsection, i: number, j?: number) {
    const sections = deck.sections.map((s, si) => {
      if (si !== i) return s;
      if (j === undefined) return { ...s, ...update(s) };
      return {
        ...s,
        subsections: (s.subsections ?? []).map((sub, sj) => (sj === j ? update(sub) : sub)),
      };
    });
    setDeck({ ...deck, sections });
    setSaving(true);
    setError("");
    const result = await updateDeckSectionsAction(id, sections);
    setSaving(false);
    // 保存に失敗しても、画面の内容でダウンロードはできる
    if (result.error) setError(`${result.error} ダウンロードは変更後の内容で作れます。`);
  }

  const slideProps = (i: number, j?: number) => ({
    onChange: (layout: SlideLayout) => updateSlide((slide) => changeLayout(slide, layout), i, j),
    onSave: (next: Subsection) => updateSlide(() => next, i, j),
  });

  return (
    <>
      <div className="flex flex-col gap-1">
        <DownloadButton deck={deck} />
        {saving && <p className="text-xs text-[var(--muted)]">保存中…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="flex flex-col gap-3">
        {/* 2枚目のアジェンダ（中項目の見出しを箇条書きで並べる） */}
        <article className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 text-sm shadow-[var(--shadow-card)]">
          <h2 className="text-base font-semibold">アジェンダ</h2>
          <Bullets items={deck.sections.map((s) => s.heading)} />
        </article>
        {deck.sections.map((s, i) => (
          <article
            key={i}
            className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--background)] p-4 shadow-[var(--shadow-card)]"
          >
            <h2 className="font-semibold">{s.heading}</h2>
            {s.subsections && s.subsections.length > 0 ? (
              s.subsections.map((sub, j) => (
                <div key={j} className="flex flex-col gap-2 border-l-2 border-[var(--border)] pl-3">
                  <h3 className="text-sm font-semibold">{sub.heading}</h3>
                  <SlideBody slide={sub} {...slideProps(i, j)} />
                </div>
              ))
            ) : (
              <SlideBody slide={s} {...slideProps(i)} />
            )}
          </article>
        ))}
      </div>
    </>
  );
}

// 本文スライド1枚分（置き方の切り替え・文字の編集と、置き方ごとの中身）
function SlideBody({
  slide,
  onChange,
  onSave,
}: {
  slide: Subsection;
  onChange: (layout: SlideLayout) => void;
  onSave: (next: Subsection) => void;
}) {
  const [editing, setEditing] = useState(false);
  const layout = slide.layout ?? "content";
  const twoColumns = layout === "two-content" || layout === "comparison";
  if (editing) {
    return (
      <SlideEditor
        slide={slide}
        onSave={(next) => {
          onSave(next);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex items-center gap-2">
        <div className="w-full max-w-xs text-xs">
          <OriginalDropdown
            value={layout}
            onChange={(next) => onChange(next as SlideLayout)}
            options={LAYOUT_OPTIONS}
          />
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="shrink-0 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-xs transition-transform active:scale-95"
        >
          編集
        </button>
      </div>
      {layout === "content-with-caption" && slide.caption && (
        <p>
          <Colored text={slide.caption} />
        </p>
      )}
      {twoColumns ? (
        <div className="grid grid-cols-2 gap-3">
          <Bullets label={layout === "comparison" ? slide.leftLabel : undefined} items={slide.bullets} />
          <Bullets label={layout === "comparison" ? slide.rightLabel : undefined} items={slide.right ?? []} />
        </div>
      ) : (
        <Bullets items={slide.bullets} />
      )}
      {layout === "code" && slide.code && (
        <pre className="overflow-x-auto rounded-lg bg-black p-3 font-mono text-xs text-white">
          {slide.code}
        </pre>
      )}
      {layout === "bubbles" &&
        (slide.bubbles ?? []).map((text, j) => (
          <p key={j} className="w-fit rounded-2xl border border-[var(--border)] px-3 py-1">
            <Colored text={text} />
          </p>
        ))}
    </div>
  );
}

// 箇条書き（比較のときは小見出し付き）
function Bullets({ label, items }: { label?: string; items: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <p className="font-semibold">
          <Colored text={label} />
        </p>
      )}
      <ul className="list-disc space-y-1 pl-5">
        {items.map((b, j) => (
          <li key={j}>
            <Colored text={b} />
          </li>
        ))}
      </ul>
    </div>
  );
}

// [[色|語]] の印を色に変えて出す。白い画面では明るい色が読めないので、色の部分はスライドと同じ濃い背景に載せる
function Colored({ text }: { text: string }) {
  return (
    <>
      {splitRuns(text).map((run, i) =>
        run.color ? (
          <span key={i} className="rounded bg-[#24365A] px-1" style={{ color: `#${run.color}` }}>
            {run.text}
          </span>
        ) : (
          <span key={i}>{run.text}</span>
        ),
      )}
    </>
  );
}
