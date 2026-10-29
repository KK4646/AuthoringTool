import fs from "node:fs";
import path from "node:path";
import PptxGenJS from "pptxgenjs";
import { diagramKey } from "@/lib/slides/diagram";
import { splitRuns } from "@/lib/slides/emphasis";
import { loadLayout, type TextBox } from "@/lib/slides/layout";
import { renderDeck } from "@/lib/slides/render";
import type { Deck } from "@/lib/slides/types";

type Slide = ReturnType<PptxGenJS["addSlide"]>;
type TextProps = NonNullable<Parameters<Slide["addText"]>[1]>;

// 背景画像（アプリに同梱した public/ の画像）を敷く。ファイルが無ければ設定の背景色で塗る
function setBackground(slide: Slide, imagePath: string, color: string) {
  const file = path.join(process.cwd(), "public", imagePath);
  slide.background = fs.existsSync(file) ? { path: file } : { color };
}

// 設定ファイルの文字枠の値を pptxgenjs のオプションに変換する
function boxOptions(box: TextBox, fontFace: string): TextProps {
  return {
    x: box.x,
    y: box.y,
    w: box.w,
    h: box.h,
    fontSize: box.fontSize,
    color: box.color,
    bold: box.bold,
    align: box.align,
    valign: box.valign,
    fontFace: box.fontFace ?? fontFace,
    ...(box.fill ? { fill: { color: box.fill } } : {}),
    fit: "shrink" as const, // 枠からあふれたら PowerPoint 側で縮小
  };
}

// 1つの文字列を、[[色|語]] の印で色分けした区切りに変える。色の無い区切りは枠の既定の色で描かれる
function runs(text: string, paragraph: TextProps = {}) {
  const parts = splitRuns(text);
  return parts.map((run, i): { text: string; options: TextProps } => ({
    text: run.text,
    options: {
      ...(run.color ? { color: run.color } : {}),
      // 段落の設定（箇条書き・改行）は最初の区切りにだけ付ける。途中に付けると段落が分かれる
      ...(i === 0 ? paragraph : {}),
    },
  }));
}

// 箇条書き。出典の一覧は点なしの段落にする
function listLines(lines: string[], bullet: boolean) {
  return lines.flatMap((text) => {
    const parts = runs(text, bullet ? { bullet: true, paraSpaceAfter: 8 } : { paraSpaceAfter: 4 });
    // 改行は1項目の最後の区切りに付ける
    parts[parts.length - 1].options = { ...parts[parts.length - 1].options, breakLine: true };
    return parts;
  });
}

// 図解（diagram.ts の diagramKey）→ 保存済みの PNG（pptxgenjs の data の形 "image/png;base64,…"）。無い図は記法の文字のまま入れる
export type DiagramImages = Map<string, string>;

export async function buildPptx(deck: Deck, diagramImages: DiagramImages = new Map()): Promise<Buffer> {
  const layout = loadLayout();
  const font = layout.fontFace;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 16:9（13.333 × 7.5 インチ）
  pptx.title = deck.title;

  for (const r of renderDeck(deck, layout)) {
    const slide = pptx.addSlide();
    setBackground(slide, r.background, r.backgroundColor);
    for (const item of r.items) {
      const image = item.kind === "text" && item.key === "diagram" ? diagramImages.get(diagramKey(item.text, item.box)) : undefined;
      if (image) slide.addImage({ data: image, x: item.box.x, y: item.box.y, w: item.box.w, h: item.box.h });
      else if (item.kind === "text") slide.addText(runs(item.text), boxOptions(item.box, font));
      else slide.addText(listLines(item.lines, item.bullet), boxOptions(item.box, font));
    }
  }

  return (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
}
