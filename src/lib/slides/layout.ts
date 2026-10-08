import fs from "node:fs";
import path from "node:path";

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
};

type SlideBase = {
  background: string; // public/ からの相対パス
  backgroundColor: string; // 画像が無いときの背景色
};

export type Layout = {
  fontFace: string;
  title: SlideBase & { title: TextBox; subtitle: TextBox };
  agenda: SlideBase & { heading: TextBox; body: TextBox };
  content: SlideBase & {
    heading: TextBox;
    body: TextBox;
    maxBullets: number;
    maxCharsPerBullet: number;
  };
  sources: SlideBase & { heading: TextBox; body: TextBox; maxPerSlide: number };
};

// 編集後すぐ反映されるよう、毎回ファイルから読み込む
export function loadLayout(): Layout {
  const file = path.join(process.cwd(), "config", "layout.json");
  return JSON.parse(fs.readFileSync(file, "utf-8")) as Layout;
}
