import fs from "node:fs";
import path from "node:path";
import PptxGenJS from "pptxgenjs";
import { loadLayout, type TextBox } from "@/lib/slides/layout";
import { allSources, type Deck, type Subsection } from "@/lib/slides/types";

type Slide = ReturnType<PptxGenJS["addSlide"]>;

// 背景画像（アプリに同梱した public/ の画像）を敷く。ファイルが無ければ設定の背景色で塗る
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
    fontFace: box.fontFace ?? fontFace,
    ...(box.fill ? { fill: { color: box.fill } } : {}),
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
  agenda.addText("アジェンダ", boxOptions(a.heading, font));
  agenda.addText(
    bulletLines(deck.sections.map((s) => s.heading)),
    boxOptions(a.body, font),
  );

  // 本文スライド。置き方（layout）の設定にある枠だけに書く。小項目のある中項目は、
  // 区切りのスライドの後に小項目ごとに1枚
  const addContentSlide = (content: Subsection) => {
    const c = layout.layouts[content.layout ?? "content"];
    const slide = pptx.addSlide();
    setBackground(slide, c.background, c.backgroundColor);
    const texts: [TextBox | undefined, string | undefined][] = [
      [c.heading, content.heading],
      [c.leftLabel, content.leftLabel],
      [c.rightLabel, content.rightLabel],
      [c.caption, content.caption],
      [c.bubbleLarge, content.bubbles?.[0]],
      [c.bubbleSmall, content.bubbles?.[1]],
      [c.code, content.code],
    ];
    for (const [box, text] of texts) {
      if (box && text) slide.addText(text, boxOptions(box, font));
    }
    // 1段の置き方は body、2段の置き方は left に、同じ bullets を書く
    const lists: [TextBox | undefined, string[] | undefined][] = [
      [c.body, content.bullets],
      [c.left, content.bullets],
      [c.right, content.right],
    ];
    for (const [box, lines] of lists) {
      if (box && lines && lines.length > 0) slide.addText(bulletLines(lines), boxOptions(box, font));
    }
  };
  const d = layout.divider;
  for (const section of deck.sections) {
    const subsections = section.subsections ?? [];
    if (subsections.length === 0) {
      addContentSlide(section);
      continue;
    }
    const divider = pptx.addSlide();
    setBackground(divider, d.background, d.backgroundColor);
    divider.addText(section.heading, boxOptions(d.heading, font));
    for (const sub of subsections) addContentSlide(sub);
  }

  // 出典（多いときは複数枚に分ける）
  const s = layout.sources;
  const unique = allSources(deck);
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
