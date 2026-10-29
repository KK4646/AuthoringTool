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
const SLIDE_RIGHT = 13.0; // 図の右端（スライドの幅は 13.333。端の飾りにかからない程度まで寄せる）

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
  // 左の段の下にコード枠がある置き方（箇条書き＋コード＋図解）は、コードの一番長い行（行番号の分も足す）も収まる幅にする
  const code = c.code && c.code.x === text.x ? c.code : undefined;
  const codeWidth = code ? codeTextWidth(content.code ?? "", code) : 0;
  const w = Math.min(FLEX_TEXT_MAX, Math.max(FLEX_TEXT_MIN, longest, codeWidth));
  const x = text.x + w + FLEX_GAP;
  return {
    ...c,
    [key]: { ...text, w },
    ...(code ? { code: { ...code, w } } : {}),
    diagram: { ...diagram, x, w: SLIDE_RIGHT - x },
  };
}

// 箇条書き n 項目の高さ（インチ）。1行は文字の大きさの1.25倍、項目の間に 8pt、枠の上下の余白 0.2
const listHeight = (n: number, fontSize: number) => (n * (fontSize * 1.25 + 8)) / 72 + 0.2;
// コードの一番長い行の幅（インチ）。等幅の半角は文字の大きさの6割、行番号の4文字分と枠の内側の余白も足す
const codeTextWidth = (code: string, box: TextBox) =>
  Math.max(0, ...code.split("\n").map((line) => ((line.length + 4) * 0.6 * box.fontSize) / 72)) + (box.inset ?? 0.1) * 2;

// 文字の大きさは、設定の大きさからこの倍率まで、枠に収まる範囲で大きくする（中身が少ないと下が大きく空くため。
// 2026-10-29 ユーザーの指示）。見出し・図は変えない
const GROW_MAX = 1.4;
const GROW_MAX_PT = 30;

// 箇条書きの文字を、どの項目も1行に収まり、全項目が枠の高さに収まる最大の大きさにする。
// 2段の置き方は左右で同じ大きさにそろえる。図のある置き方は左の段の幅を文に合わせているので変えない
function growLists(c: ContentLayout, content: Subsection): ContentLayout {
  if (c.diagram) return c;
  const lists: ["body" | "left" | "right", string[]][] = [
    ["body", content.bullets],
    ["left", content.bullets],
    ["right", content.right ?? []],
  ];
  let scale = Infinity;
  for (const [key, lines] of lists) {
    const box = c[key];
    if (!box || lines.length === 0) continue;
    const max = Math.min(box.fontSize * GROW_MAX, Math.max(GROW_MAX_PT, box.fontSize));
    let f = box.fontSize;
    const fits = (size: number) =>
      lines.every((line) => textWidth(line, size) + 0.8 <= box.w) && listHeight(lines.length, size) <= box.h;
    while (f + 1 <= max && fits(f + 1)) f++;
    scale = Math.min(scale, f / box.fontSize);
  }
  if (!Number.isFinite(scale) || scale <= 1) return c;
  const grow = (box: TextBox | undefined) => box && { ...box, fontSize: Math.round(box.fontSize * scale) };
  return { ...c, body: grow(c.body), left: grow(c.left), right: grow(c.right) };
}

// 文章（説明文・吹き出しの文）は折り返してよいので、行数を見積もって枠の高さに収まる最大の大きさにする
// 吹き出しは枠が細いので、大きくしすぎると語の途中で何度も折り返す。説明文より小さめで止める
const PARAGRAPH_MAX_PT: Record<"caption" | "bubbleLarge" | "bubbleSmall", number> = { caption: 22, bubbleLarge: 19, bubbleSmall: 19 };
function growParagraphs(c: ContentLayout, content: Subsection): ContentLayout {
  const texts: ["caption" | "bubbleLarge" | "bubbleSmall", string | undefined][] = [
    ["caption", content.caption],
    ["bubbleLarge", content.bubbles?.[0]],
    ["bubbleSmall", content.bubbles?.[1]],
  ];
  const next = { ...c };
  for (const [key, text] of texts) {
    const box = c[key];
    if (!box || !text) continue;
    // 1行に入る幅（インチ）は枠の幅から内側の余白を引いたもの。文の幅をそれで割って行数にする
    const fits = (size: number) => {
      const lines = text.split("\n").reduce((n, part) => n + Math.max(1, Math.ceil(textWidth(part, size) / (box.w - 0.3))), 0);
      return (lines * size * 1.3) / 72 + 0.2 <= box.h;
    };
    let f = box.fontSize;
    while (f + 1 <= Math.max(box.fontSize, PARAGRAPH_MAX_PT[key]) && fits(f + 1)) f++;
    next[key] = { ...box, fontSize: f };
  }
  return next;
}

// 箇条書きの下にコード枠がある置き方（コード・箇条書き＋コード＋図解）は、コード枠を箇条書きのすぐ下に、行数に合わせた
// 高さで置く（説明とコードの間や、コード枠の下に大きな空きが残らないように）。図の無い置き方はコードの文字も大きくする
function stackCode(c: ContentLayout, content: Subsection): ContentLayout {
  const key = c.left ? "left" : "body";
  const text = c[key];
  const code = c.code;
  if (!text || !code || code.y <= text.y) return c;
  const lines = (content.code ?? "").split("\n").length;
  const textH = content.bullets.length > 0 ? listHeight(content.bullets.length, text.fontSize) : 0;
  const y = text.y + textH + 0.25;
  const room = code.y + code.h - y; // コード枠に使える高さ
  const inset = (code.inset ?? 0.1) * 2;
  const codeH = (size: number) => (lines * size * 1.25) / 72 + inset;
  let size = code.fontSize;
  if (!c.diagram) {
    const max = Math.min(code.fontSize * GROW_MAX, 26);
    while (size + 1 <= max && codeH(size + 1) <= room && codeTextWidth(content.code ?? "", { ...code, fontSize: size + 1 }) <= code.w) size++;
  }
  return {
    ...c,
    [key]: { ...text, h: Math.max(textH, 0.4) },
    code: { ...code, fontSize: size, y, h: Math.min(room, codeH(size)) },
  };
}

// 本文スライド1枚分の文字枠と中身の対応。pptx もプレビューもこれを描く。
// includeEmpty を付けると中身が空の枠も返す（編集画面で空の枠に書き込めるようにするため）
export function contentSlideItems(layoutDef: ContentLayout, content: Subsection, includeEmpty = false): SlideItem[] {
  const c = stackCode(growParagraphs(growLists(flexDiagramLayout(layoutDef, content), content), content), content);
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
