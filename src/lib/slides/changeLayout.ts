import type { SlideLayout, Subsection } from "@/lib/slides/types";

// 箇条書きを左右2段で使う置き方
const TWO_COLUMN_LAYOUTS: SlideLayout[] = ["two-content", "comparison"];

/**
 * 本文スライドの置き方を変える。AI は使わず、箇条書きを機械的に振り分け直す。
 * - 2段 → 1段: 右の段を左の段の後ろにつなげる
 * - 1段 → 2段: 箇条書きを前半（左）と後半（右）に分ける
 * 説明文・吹き出しの文・コード・比較の小見出しはそのまま持っておく（置き方で使わなければ描かれないだけ。
 * 元の置き方に戻せば、また描かれる）
 */
export function changeLayout<T extends Subsection>(slide: T, layout: SlideLayout): T {
  const right = slide.right ?? [];
  const toTwoColumns = TWO_COLUMN_LAYOUTS.includes(layout);

  if (toTwoColumns && right.length === 0) {
    const half = Math.ceil(slide.bullets.length / 2);
    return {
      ...slide,
      layout,
      bullets: slide.bullets.slice(0, half),
      right: slide.bullets.slice(half),
    };
  }
  if (!toTwoColumns && right.length > 0) {
    return { ...slide, layout, bullets: [...slide.bullets, ...right], right: undefined };
  }
  return { ...slide, layout };
}
