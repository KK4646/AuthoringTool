// プレビューの中で文字を直すときの、画面（contentEditable）と [[色|語]] の印つき文字列との行き来。
// 色を付けた部分は <span data-color="黄などのキー"> で持つ

import { EMPHASIS_COLORS, hexOf, type EmphasisKey } from "@/lib/slides/emphasis";

const KEYS = new Set<string>(EMPHASIS_COLORS.map((c) => c.key));

// 色つきの span を作る
export function colorSpan(key: EmphasisKey, text: string): HTMLSpanElement {
  const span = document.createElement("span");
  span.dataset.color = key;
  span.style.color = `#${hexOf(key)}`;
  span.textContent = text;
  return span;
}

// 1行分の中身を印つき文字列にする。色つき span の中はまとめて1つの印にする（入れ子は内側を優先しない）
function inlineToMarked(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (!(node instanceof HTMLElement)) return "";
  if (node.tagName === "BR") return "\n";
  const key = node.dataset.color;
  if (key && KEYS.has(key)) {
    const inner = node.textContent ?? "";
    return inner ? `[[${key}|${inner}]]` : "";
  }
  return Array.from(node.childNodes).map(inlineToMarked).join("");
}

// 枠の中身を行ごとに読む。ブロック要素（Enter で増えた div など）を1行とし、空行は除く
export function readLines(root: HTMLElement): string[] {
  const lines: string[] = [];
  let current = "";
  const flush = () => {
    for (const line of current.split("\n")) if (line.trim()) lines.push(line.trim());
    current = "";
  };
  for (const node of Array.from(root.childNodes)) {
    const isBlock = node instanceof HTMLElement && ["DIV", "P", "LI"].includes(node.tagName);
    if (isBlock) {
      flush();
      current = Array.from(node.childNodes).map(inlineToMarked).join("");
      flush();
    } else {
      current += inlineToMarked(node);
    }
  }
  flush();
  return lines;
}

// 色つき span の中の1つの文字ノード node を、span の外に出す。span は node の前後で2つに分かれる
// （色つき span を入れ子にしないため。入れ子になると読み戻しで外側の色にまとめられてしまう）
function liftOut(node: Text): void {
  const parent = node.parentElement;
  const key = parent?.dataset.color as EmphasisKey | undefined;
  if (!parent || !key || !KEYS.has(key)) return;
  const offset = offsetIn(parent, node);
  const before = parent.textContent!.slice(0, offset);
  const after = parent.textContent!.slice(offset + node.length);
  const pieces: Node[] = [];
  if (before) pieces.push(colorSpan(key, before));
  pieces.push(node);
  if (after) pieces.push(colorSpan(key, after));
  parent.replaceWith(...pieces);
}

// parent の中で node が始まる文字位置
function offsetIn(parent: HTMLElement, node: Text): number {
  let n = 0;
  for (const child of Array.from(parent.childNodes)) {
    if (child === node) return n;
    n += child.textContent?.length ?? 0;
  }
  return n;
}

// 今の選択範囲（root の中にあるもの）に色を付ける。key が無ければ外す。色を付けたら true。
// 複数行にまたがる選択でも行の形を保つため、文字ノードごとに選ばれた部分だけを切り出して扱う
export function colorSelection(root: HTMLElement, key?: EmphasisKey): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return false;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const targets: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (range.intersectsNode(node)) targets.push(node as Text);
  }
  let changed = false;
  for (const node of targets) {
    const start = node === range.startContainer ? range.startOffset : 0;
    const end = node === range.endContainer ? range.endOffset : node.length;
    if (start >= end) continue;
    // 選ばれた部分だけを独立した文字ノードにする
    const mid = start > 0 ? node.splitText(start) : node;
    if (end - start < mid.length) mid.splitText(end - start);
    liftOut(mid);
    if (key) mid.replaceWith(colorSpan(key, mid.data));
    changed = true;
  }
  if (changed) sel.removeAllRanges();
  return changed;
}
