import fs from "node:fs";
import path from "node:path";
import PptxGenJS from "pptxgenjs";
import { loadLayout, type TextBox } from "@/lib/slides/layout";
import { allSources, type Deck } from "@/lib/slides/types";
import type { BackgroundSlot } from "@/lib/slides/backgrounds";

type Slide = ReturnType<PptxGenJS["addSlide"]>;

// 背景画像を敷く。アップロード画像（data 形式）があればそれを、無ければ既定の画像ファイルを使い、
// どちらも無ければ設定の背景色で塗る
function setBackground(slide: Slide, imagePath: string, color: string, uploaded?: string) {
  if (uploaded) {
    slide.background = { data: uploaded };
    return;
  }
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

// backgrounds: 設定画面でアップロードした背景画像（pptxgenjs の data 形式）。無い枠は既定の画像
export async function buildPptx(
  deck: Deck,
  backgrounds: Partial<Record<BackgroundSlot, string>> = {},
): Promise<Buffer> {
  const layout = loadLayout();
  const font = layout.fontFace;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 16:9（13.333 × 7.5 インチ）
  pptx.title = deck.title;

  // 表紙
  const t = layout.title;
  const cover = pptx.addSlide();
  setBackground(cover, t.background, t.backgroundColor, backgrounds.title);
  cover.addText(deck.title, boxOptions(t.title, font));
  if (deck.subtitle) cover.addText(deck.subtitle, boxOptions(t.subtitle, font));

  // 目次
  const a = layout.agenda;
  const agenda = pptx.addSlide();
  setBackground(agenda, a.background, a.backgroundColor, backgrounds.content);
  agenda.addText("目次", boxOptions(a.heading, font));
  agenda.addText(
    bulletLines(deck.sections.map((s) => s.heading)),
    boxOptions(a.body, font),
  );

  // 本文スライド。小項目のある中項目は、区切りのスライドの後に小項目ごとに1枚
  const c = layout.content;
  const addContentSlide = (heading: string, bullets: string[]) => {
    const slide = pptx.addSlide();
    setBackground(slide, c.background, c.backgroundColor, backgrounds.content);
    slide.addText(heading, boxOptions(c.heading, font));
    slide.addText(bulletLines(bullets), boxOptions(c.body, font));
  };
  const d = layout.divider;
  for (const section of deck.sections) {
    const subsections = section.subsections ?? [];
    if (subsections.length === 0) {
      addContentSlide(section.heading, section.bullets);
      continue;
    }
    // 区切りは表紙と同じ背景（アップロード画像も表紙用を使う）
    const divider = pptx.addSlide();
    setBackground(divider, d.background, d.backgroundColor, backgrounds.title);
    divider.addText(section.heading, boxOptions(d.heading, font));
    for (const sub of subsections) addContentSlide(sub.heading, sub.bullets);
  }

  // 出典（多いときは複数枚に分ける）
  const s = layout.sources;
  const unique = allSources(deck);
  for (let i = 0; i < unique.length; i += s.maxPerSlide) {
    const page = unique.slice(i, i + s.maxPerSlide);
    const slide = pptx.addSlide();
    setBackground(slide, s.background, s.backgroundColor, backgrounds.content);
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
