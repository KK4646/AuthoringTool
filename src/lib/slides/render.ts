import type { ContentLayout, Layout, TextBox } from "@/lib/slides/layout";
import { splitRuns } from "@/lib/slides/emphasis";
import { allSources, type Deck, type Subsection } from "@/lib/slides/types";

// 本文スライドの文字枠のキー（config/layout.json の layouts.<置き方> のキーと同じ）
export type BoxKey =
  | "heading"
  | "body"
  | "left"
  | "right"
  | "leftLabel"
  | "rightLabel"
  | "caption"
  | "bubbleLarge"
  | "bubbleSmall"
  | "code"
  | "diagram";

// 1枚のスライドに置く文字。list は箇条書き（1要素が1項目。出典の一覧は点なし）、text は1つの文
export type SlideItem =
  | { key: BoxKey | "title" | "subtitle"; box: TextBox; kind: "text"; text: string }
  | { key: BoxKey; box: TextBox; kind: "list"; lines: string[]; bullet: boolean };

export type RenderedSlide = {
  background: string; // public/ からの相対パス
  backgroundColor: string;
  items: SlideItem[];
  // 本文スライドなら、どの中項目（i）・小項目（j）か。編集と置き方の変更はこれで対象を探す
  source?: { i: number; j?: number };
};

// 左に箇条書き・右に図の置き方で、左の段の幅を文の長さに合わせて変える（図のせいで文が途中で折り返さないように。
// 2026-10-29 ユーザーの指示）。図は残りの幅を使う。左の段はこの範囲（インチ）に収める
const FLEX_TEXT_MIN = 3.0;
const FLEX_TEXT_MAX = 7.0;
const FLEX_GAP = 0.3; // 左の段と図の間
const SLIDE_RIGHT = 12.5; // 図の右端

// 1行の文字の幅（インチ）。全角は文字の大きさより少し広め、半角はその6割として見積もる
function textWidth(text: string, fontSize: number): number {
  const plain = splitRuns(text).map((r) => r.text).join("");
  const em = [...plain].reduce((n, ch) => n + (ch.charCodeAt(0) < 0x2000 ? 0.6 : 1.05), 0);
  return (em * fontSize) / 72;
}

export function flexDiagramLayout(c: ContentLayout, content: Subsection): ContentLayout {
  const key = c.left ? "left" : "body";
  const text = c[key];
  const diagram = c.diagram;
  if (!text || !diagram || diagram.x <= text.x) return c;
  // 点と字下げ・枠の内側の余白の分（約0.8インチ）を足す。足りないと最後の1文字だけ折り返す
  const longest = Math.max(0, ...content.bullets.map((b) => textWidth(b, text.fontSize))) + 0.8;
  const w = Math.min(FLEX_TEXT_MAX, Math.max(FLEX_TEXT_MIN, longest));
  const x = text.x + w + FLEX_GAP;
  return { ...c, [key]: { ...text, w }, diagram: { ...diagram, x, w: SLIDE_RIGHT - x } };
}

// 本文スライド1枚分の文字枠と中身の対応。pptx もプレビューもこれを描く。
// includeEmpty を付けると中身が空の枠も返す（編集画面で空の枠に書き込めるようにするため）
export function contentSlideItems(layoutDef: ContentLayout, content: Subsection, includeEmpty = false): SlideItem[] {
  const c = flexDiagramLayout(layoutDef, content);
  const texts: [BoxKey, TextBox | undefined, string | undefined][] = [
    ["heading", c.heading, content.heading],
    ["leftLabel", c.leftLabel, content.leftLabel],
    ["rightLabel", c.rightLabel, content.rightLabel],
    ["caption", c.caption, content.caption],
    ["bubbleLarge", c.bubbleLarge, content.bubbles?.[0]],
    ["bubbleSmall", c.bubbleSmall, content.bubbles?.[1]],
    ["code", c.code, content.code],
    ["diagram", c.diagram, content.diagram],
  ];
  // 1段の置き方は body、2段の置き方は left に、同じ bullets を書く
  const lists: [BoxKey, TextBox | undefined, string[] | undefined][] = [
    ["body", c.body, content.bullets],
    ["left", c.left, content.bullets],
    ["right", c.right, content.right],
  ];
  return [
    ...texts.flatMap(([key, box, text]) =>
      box && (text || includeEmpty) ? [{ key, box, kind: "text" as const, text: text ?? "" }] : [],
    ),
    ...lists.flatMap(([key, box, lines]) =>
      box && ((lines && lines.length > 0) || includeEmpty)
        ? [{ key, box, kind: "list" as const, lines: lines ?? [], bullet: true }]
        : [],
    ),
  ];
}

// スライド全体を、1枚ずつの「背景＋文字」の並びにする（表紙 → 目次 → 本文 → 出典）
export function renderDeck(deck: Deck, layout: Layout): RenderedSlide[] {
  const slides: RenderedSlide[] = [];

  const t = layout.title;
  slides.push({
    background: t.background,
    backgroundColor: t.backgroundColor,
    items: [
      { key: "title", box: t.title, kind: "text", text: deck.title },
      ...(deck.subtitle ? [{ key: "subtitle" as const, box: t.subtitle, kind: "text" as const, text: deck.subtitle }] : []),
    ],
  });

  const a = layout.agenda;
  slides.push({
    background: a.background,
    backgroundColor: a.backgroundColor,
    items: [
      { key: "heading", box: a.heading, kind: "text", text: "アジェンダ" },
      { key: "body", box: a.body, kind: "list", lines: deck.sections.map((s) => s.heading), bullet: true },
    ],
  });

  const contentSlide = (content: Subsection, source: RenderedSlide["source"]): RenderedSlide => {
    const c = layout.layouts[content.layout ?? "content"];
    return { background: c.background, backgroundColor: c.backgroundColor, items: contentSlideItems(c, content), source };
  };
  const d = layout.divider;
  deck.sections.forEach((section, i) => {
    const subsections = section.subsections ?? [];
    if (subsections.length === 0) {
      slides.push(contentSlide(section, { i }));
      return;
    }
    slides.push({
      background: d.background,
      backgroundColor: d.backgroundColor,
      items: [{ key: "heading", box: d.heading, kind: "text", text: section.heading }],
    });
    subsections.forEach((sub, j) => slides.push(contentSlide(sub, { i, j })));
  });

  // 出典（多いときは複数枚に分ける）
  const s = layout.sources;
  const unique = allSources(deck);
  for (let i = 0; i < unique.length; i += s.maxPerSlide) {
    const page = unique.slice(i, i + s.maxPerSlide);
    slides.push({
      background: s.background,
      backgroundColor: s.backgroundColor,
      items: [
        { key: "heading", box: s.heading, kind: "text", text: i === 0 ? "出典" : "出典（続き）" },
        { key: "body", box: s.body, kind: "list", lines: page.map((src) => `${src.title}\n${src.url}`), bullet: false },
      ],
    });
  }
  return slides;
}
