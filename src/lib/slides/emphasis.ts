// 本文の文字に付ける色（強調）。文字列の中に [[色|語]] の印を埋めて持ち、pptx と画面でその部分だけ色を変える。
// DB の列は増やさない（decks.sections の文字列にそのまま入る）。印が無い古い履歴は今までどおり

// 選べる色。暗い背景（24365A）の上で読める明るめの色にそろえている
export const EMPHASIS_COLORS = [
  { key: "yellow", label: "黄", hex: "FFD966" },
  { key: "red", label: "赤", hex: "FF8A80" },
  { key: "green", label: "緑", hex: "A5F3A5" },
  { key: "blue", label: "水色", hex: "8EC9FF" },
] as const;

export type EmphasisKey = (typeof EMPHASIS_COLORS)[number]["key"];

// 文字列の一部分。color が無ければ枠の既定の色で描く
export type TextRun = { text: string; color?: string };

const KEYS = EMPHASIS_COLORS.map((c) => c.key).join("|");
// [[yellow|語]] の形。知らない色の名前は印として扱わず、そのまま文字として残す
const MARK = new RegExp(`\\[\\[(${KEYS})\\|([^\\]]*)\\]\\]`, "g");

export function hexOf(key: EmphasisKey): string {
  return EMPHASIS_COLORS.find((c) => c.key === key)!.hex;
}

// 印のついた文字列を、色ごとの区切り（run）に分ける
export function splitRuns(text: string): TextRun[] {
  const runs: TextRun[] = [];
  let last = 0;
  for (const m of text.matchAll(MARK)) {
    const index = m.index ?? 0;
    if (index > last) runs.push({ text: text.slice(last, index) });
    if (m[2]) runs.push({ text: m[2], color: hexOf(m[1] as EmphasisKey) });
    last = index + m[0].length;
  }
  if (last < text.length) runs.push({ text: text.slice(last) });
  return runs.length > 0 ? runs : [{ text: "" }];
}

// 印を外して文字だけにする
export function stripMarks(text: string): string {
  return text.replace(MARK, "$2");
}

// 文字列の start〜end の範囲に色を付ける。範囲の中にあった印は外してから付け直す
export function markRange(text: string, start: number, end: number, key: EmphasisKey): string {
  const inner = stripMarks(text.slice(start, end));
  if (inner === "") return text;
  return `${text.slice(0, start)}[[${key}|${inner}]]${text.slice(end)}`;
}
