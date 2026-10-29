import fs from "node:fs";
import path from "node:path";
import type { SlideLayout } from "@/lib/slides/types";

// 文字枠1つ分の設定（単位はインチ。スライドは幅13.333 × 高さ7.5）
export type TextBox = {
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize: number;
  color: string;
  bold: boolean;
  align: "left" | "center" | "right";
  valign: "top" | "middle" | "bottom";
  fontFace?: string; // 枠だけ別のフォントにするとき（コード枠の等幅フォントなど）
  fill?: string; // 枠の塗りつぶし色（コード枠など）
  inset?: number; // 枠の端と文字の間の余白（インチ。無ければ pptx の既定の 0.05〜0.1）
};

type SlideBase = {
  background: string; // public/ からの相対パス
  backgroundColor: string; // 画像が無いときの背景色
};

// 本文スライドの文字枠。heading=見出し、body / left=箇条書き（left は2段の左）、right=2段の右、
// leftLabel / rightLabel=比較の小見出し、caption=説明文、bubbleLarge / bubbleSmall=吹き出しの文、code=コード、
// diagram=図解の図（編集中は記法の文字）
export type ContentLayout = SlideBase &
  Partial<
    Record<
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
      | "diagram",
      TextBox
    >
  >;

export type Layout = {
  fontFace: string;
  title: SlideBase & { title: TextBox; subtitle: TextBox };
  agenda: SlideBase & { heading: TextBox; body: TextBox };
  // 小項目のある中項目の、区切りのスライド（中項目の見出しだけ）
  divider: SlideBase & { heading: TextBox };
  // 本文の文字数・項目数の上限（AI への指示に使う）。ColumnBullet は2段・説明文付き・吹き出しの置き方の箇条書き
  content: {
    maxBullets: number;
    maxCharsPerBullet: number;
    maxCharsPerColumnBullet: number;
    maxCaptionChars: number;
    maxBubbleLargeChars: number;
    maxBubbleSmallChars: number;
    maxCodeBullets: number;
    maxCodeLines: number;
    maxCodeLineChars: number;
    maxDiagramNodes: number;
    maxDiagramNodeChars: number;
  };
  // 本文スライドの置き方ごとの背景と文字枠。枠がある項目だけ描く
  layouts: Record<SlideLayout, ContentLayout>;
  sources: SlideBase & { heading: TextBox; body: TextBox; maxPerSlide: number };
};

// 編集後すぐ反映されるよう、毎回ファイルから読み込む
export function loadLayout(): Layout {
  const file = path.join(process.cwd(), "config", "layout.json");
  return JSON.parse(fs.readFileSync(file, "utf-8")) as Layout;
}
