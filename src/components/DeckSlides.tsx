"use client";

import { useState } from "react";
import { updateDeckSectionsAction } from "@/app/decks/actions";
import { DownloadButton } from "@/components/DownloadButton";
import { OriginalDropdown } from "@/components/OriginalDropdown";
import { SlideEditor } from "@/components/SlideEditor";
import { SlidePreview } from "@/components/SlidePreview";
import { changeLayout } from "@/lib/slides/changeLayout";
import type { Layout } from "@/lib/slides/layout";
import { renderDeck, type RenderedSlide } from "@/lib/slides/render";
import { SLIDE_LAYOUT_LABELS, SLIDE_LAYOUTS, type Deck, type SlideLayout, type Subsection } from "@/lib/slides/types";

const LAYOUT_OPTIONS = SLIDE_LAYOUTS.map((value) => ({ value, label: SLIDE_LAYOUT_LABELS[value] }));

/**
 * 履歴の詳細画面。スライドを1枚ずつプレビューで並べ、本文スライドは置き方を変えられ（変えたらすぐ保存）、
 * 「編集」でプレビューの中の文字を直して色を付けられる（保存ボタンで保存）。ダウンロードは変えた後の内容で作る。
 */
export function DeckSlides({ id, initialDeck, layout }: { id: string; initialDeck: Deck; layout: Layout }) {
  const [deck, setDeck] = useState(initialDeck);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // 編集中の本文スライド（"i" または "i-j"）
  const [editing, setEditing] = useState<string | null>(null);

  const slides = renderDeck(deck, layout);

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

  const slideOf = ({ i, j }: NonNullable<RenderedSlide["source"]>): Subsection =>
    j === undefined ? deck.sections[i] : (deck.sections[i].subsections ?? [])[j];
  const keyOf = ({ i, j }: NonNullable<RenderedSlide["source"]>) => (j === undefined ? `${i}` : `${i}-${j}`);

  return (
    <>
      <div className="flex flex-col gap-1">
        <DownloadButton deck={deck} diagramBox={layout.layouts.diagram.diagram} />
        {saving && <p className="text-xs text-[var(--muted)]">保存中…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <ol className="flex flex-col gap-5">
        {slides.map((slide, index) => {
          const src = slide.source;
          const content = src ? slideOf(src) : undefined;
          const isEditing = src !== undefined && editing === keyOf(src);
          return (
            <li key={index} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                <span className="w-6 shrink-0">{index + 1}</span>
                {src && content && !isEditing && (
                  <>
                    <div className="w-full max-w-xs">
                      <OriginalDropdown
                        value={content.layout ?? "content"}
                        onChange={(next) => updateSlide((s) => changeLayout(s, next as SlideLayout), src.i, src.j)}
                        options={LAYOUT_OPTIONS}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditing(keyOf(src))}
                      className="shrink-0 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--foreground)] transition-transform active:scale-95"
                    >
                      編集
                    </button>
                  </>
                )}
              </div>
              {isEditing && content ? (
                <SlideEditor
                  slide={content}
                  layoutDef={layout.layouts[content.layout ?? "content"]}
                  onSave={(next) => {
                    setEditing(null);
                    updateSlide(() => next, src.i, src.j);
                  }}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <SlidePreview slide={slide} />
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}
