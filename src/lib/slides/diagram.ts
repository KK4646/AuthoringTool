import type { Layout, TextBox } from "@/lib/slides/layout";
import { renderDeck } from "@/lib/slides/render";
import type { Deck } from "@/lib/slides/types";

// 図解の置き方（Mermaid の記法から描く図）の画像の置き場所。ブラウザ（描いて保存）とサーバー（pptx に貼る）の両方で使う

// 画像を置く Storage のバケット（0120）。非公開で、本人のフォルダだけ読み書きできる
export const DIAGRAM_BUCKET = "slideapp-diagrams";

// 画像は枠と同じ縦横比で、1インチあたりこの画素数で作る（pptx に貼っても粗く見えない大きさ）
export const DIAGRAM_PX_PER_INCH = 200;

// 図の見た目（DiagramBox の配色など）を変えたら上げる。古い見た目の画像を使わず描き直させるため
const DIAGRAM_STYLE_VERSION = 4;

// 図1枚を見分ける文字列。画像は枠の縦横比で作るので、同じ記法でも枠の大きさが違えば別の画像にする
export function diagramKey(code: string, box: TextBox): string {
  return `v${DIAGRAM_STYLE_VERSION}\n${box.w}x${box.h}\n${code.trim()}`;
}

// diagramKey の SHA-256（16進）。同じ図なら同じ名前になるので、二重に保存しない
export async function diagramHash(key: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

// バケットの中のキー。先頭のフォルダを user_id にする（ポリシーがここで本人に絞る）
export async function diagramPath(userId: string, code: string, box: TextBox): Promise<string> {
  return `${userId}/${await diagramHash(diagramKey(code, box))}.png`;
}

// スライドにある図解の一覧（記法と、描く枠）。置き方ごとに枠が違うので renderDeck から拾う
export function diagramItems(deck: Deck, layout: Layout): { code: string; box: TextBox }[] {
  return renderDeck(deck, layout).flatMap((slide) =>
    slide.items.flatMap((item) =>
      item.key === "diagram" && item.kind === "text" && item.text ? [{ code: item.text, box: item.box }] : [],
    ),
  );
}
