import type { Deck } from "@/lib/slides/types";

// 図解の置き方（Mermaid の記法から描く図）の画像の置き場所。ブラウザ（描いて保存）とサーバー（pptx に貼る）の両方で使う

// 画像を置く Storage のバケット（0120）。非公開で、本人のフォルダだけ読み書きできる
export const DIAGRAM_BUCKET = "slideapp-diagrams";

// 画像は枠と同じ縦横比で、1インチあたりこの画素数で作る（pptx に貼っても粗く見えない大きさ）
export const DIAGRAM_PX_PER_INCH = 200;

// 記法の SHA-256（16進）。記法が同じなら同じ名前になるので、同じ図を二重に保存しない
export async function diagramHash(code: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code.trim()));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

// バケットの中のキー。先頭のフォルダを user_id にする（ポリシーがここで本人に絞る）
export async function diagramPath(userId: string, code: string): Promise<string> {
  return `${userId}/${await diagramHash(code)}.png`;
}

// スライドにある図解の記法の一覧
export function diagramCodes(deck: Deck): string[] {
  return deck.sections
    .flatMap((s) => [s, ...(s.subsections ?? [])])
    .filter((s) => s.layout === "diagram" && s.diagram)
    .map((s) => s.diagram!);
}
