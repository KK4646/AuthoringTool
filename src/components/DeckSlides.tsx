"use client";

import { useState } from "react";
import { updateDeckSectionsAction } from "@/app/decks/actions";
import { DownloadButton } from "@/components/DownloadButton";
import { OriginalDropdown } from "@/components/OriginalDropdown";
import { changeLayout } from "@/lib/slides/changeLayout";
import {
  SLIDE_LAYOUT_LABELS,
  SLIDE_LAYOUTS,
  type Deck,
  type SlideLayout,
  type Subsection,
} from "@/lib/slides/types";

const LAYOUT_OPTIONS = SLIDE_LAYOUTS.map((value) => ({ value, label: SLIDE_LAYOUT_LABELS[value] }));

/**
 * 履歴の詳細画面のスライド一覧とダウンロード。本文スライドごとに置き方を変えられ、変えたらすぐ保存する。
 * ダウンロードは変えた後の内容で作る。
 */
export function DeckSlides({ id, initialDeck }: { id: string; initialDeck: Deck }) {
  const [deck, setDeck] = useState(initialDeck);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // i 番目の中項目（j があればその小項目）の置き方を変えて保存する
  async function handleChange(layout: SlideLayout, i: number, j?: number) {
    const sections = deck.sections.map((s, si) => {
      if (si !== i) return s;
      if (j === undefined) return changeLayout(s, layout);
      return {
        ...s,
        subsections: (s.subsections ?? []).map((sub, sj) => (sj === j ? changeLayout(sub, layout) : sub)),
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

  return (
    <>
      <div className="flex flex-col gap-1">
        <DownloadButton deck={deck} />
        {saving && <p className="text-xs text-[var(--muted)]">保存中…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="flex flex-col gap-3">
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
                  <SlideBody slide={sub} onChange={(layout) => handleChange(layout, i, j)} />
                </div>
              ))
            ) : (
              <SlideBody slide={s} onChange={(layout) => handleChange(layout, i)} />
            )}
          </article>
        ))}
      </div>
    </>
  );
}

// 本文スライド1枚分（置き方の切り替えと、置き方ごとの中身）
function SlideBody({
  slide,
  onChange,
}: {
  slide: Subsection;
  onChange: (layout: SlideLayout) => void;
}) {
  const layout = slide.layout ?? "content";
  const twoColumns = layout === "two-content" || layout === "comparison";
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="w-full max-w-xs text-xs">
        <OriginalDropdown
          value={layout}
          onChange={(next) => onChange(next as SlideLayout)}
          options={LAYOUT_OPTIONS}
        />
      </div>
      {layout === "content-with-caption" && slide.caption && <p>{slide.caption}</p>}
      {twoColumns ? (
        <div className="grid grid-cols-2 gap-3">
          <Bullets label={layout === "comparison" ? slide.leftLabel : undefined} items={slide.bullets} />
          <Bullets label={layout === "comparison" ? slide.rightLabel : undefined} items={slide.right ?? []} />
        </div>
      ) : (
        <Bullets items={slide.bullets} />
      )}
      {layout === "code" && slide.code && (
        <pre className="overflow-x-auto rounded-lg border border-[var(--border)] p-3 font-mono text-xs">
          {slide.code}
        </pre>
      )}
      {layout === "bubbles" &&
        (slide.bubbles ?? []).map((text, j) => (
          <p key={j} className="w-fit rounded-2xl border border-[var(--border)] px-3 py-1">
            {text}
          </p>
        ))}
    </div>
  );
}

// 箇条書き（比較のときは小見出し付き）
function Bullets({ label, items }: { label?: string; items: string[] }) {
  return (
    <div className="flex flex-col gap-1">
      {label && <p className="font-semibold">{label}</p>}
      <ul className="list-disc space-y-1 pl-5">
        {items.map((b, j) => (
          <li key={j}>{b}</li>
        ))}
      </ul>
    </div>
  );
}
