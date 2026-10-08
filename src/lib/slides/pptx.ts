import fs from "node:fs";
import path from "node:path";
import PptxGenJS from "pptxgenjs";
import { loadLayout, type TextBox } from "@/lib/slides/layout";
import type { Deck } from "@/lib/slides/types";

type Slide = ReturnType<PptxGenJS["addSlide"]>;

// 背景画像を敷く。画像ファイルが無ければ設定の背景色で塗る
function setBackground(slide: Slide, imagePath: string, color: string) {
  const file = path.join(process.cwd(), "public", imagePath);
  slide.background = fs.existsSync(file) ? { path: file } : { color };
}

// 設定ファイルの文字枠の値を pptxgenjs のオプションに変換する
function boxOptions(box: TextBox, fontFace: string) {
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
    fontFace,
    fit: "shrink" as const, // 枠からあふれたら PowerPoint 側で縮小
  };
}

function bulletLines(lines: string[]) {
  return lines.map((text) => ({
    text,
    options: { bullet: true, breakLine: true, paraSpaceAfter: 8 },
  }));
}

export async function buildPptx(deck: Deck): Promise<Buffer> {
  const layout = loadLayout();
  const font = layout.fontFace;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 16:9（13.333 × 7.5 インチ）
  pptx.title = deck.title;

  // 表紙
  const t = layout.title;
  const cover = pptx.addSlide();
  setBackground(cover, t.background, t.backgroundColor);
  cover.addText(deck.title, boxOptions(t.title, font));
  if (deck.subtitle) cover.addText(deck.subtitle, boxOptions(t.subtitle, font));

  // 目次
  const a = layout.agenda;
  const agenda = pptx.addSlide();
  setBackground(agenda, a.background, a.backgroundColor);
  agenda.addText("目次", boxOptions(a.heading, font));
  agenda.addText(
    bulletLines(deck.sections.map((s) => s.heading)),
    boxOptions(a.body, font),
  );

  // 中項目ごとの本文スライド
  const c = layout.content;
  for (const section of deck.sections) {
    const slide = pptx.addSlide();
    setBackground(slide, c.background, c.backgroundColor);
    slide.addText(section.heading, boxOptions(c.heading, font));
    slide.addText(bulletLines(section.bullets), boxOptions(c.body, font));
  }

  // 出典（多いときは複数枚に分ける）
  const s = layout.sources;
  const allSources = deck.sections.flatMap((sec) => sec.sources);
  const unique = [...new Map(allSources.map((src) => [src.url, src])).values()];
  for (let i = 0; i < unique.length; i += s.maxPerSlide) {
    const page = unique.slice(i, i + s.maxPerSlide);
    const slide = pptx.addSlide();
    setBackground(slide, s.background, s.backgroundColor);
    slide.addText(i === 0 ? "出典" : "出典（続き）", boxOptions(s.heading, font));
    slide.addText(
      page.map((src) => ({
        text: `${src.title}\n${src.url}`,
        options: { breakLine: true, paraSpaceAfter: 4 },
      })),
      boxOptions(s.body, font),
    );
  }

  return (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
}
