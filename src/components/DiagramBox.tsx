"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { DIAGRAM_BUCKET, DIAGRAM_PX_PER_INCH, diagramKey, diagramPath } from "@/lib/slides/diagram";
import type { TextBox } from "@/lib/slides/layout";
import { createClient } from "@/lib/supabase/client";

// 同じ画面で同じ図を何度も保存しに行かないよう、図ごと（diagramKey）の保存の処理を覚えておく
// （ダウンロードの前に、保存が終わるのを待つためにも使う）
const saving = new Map<string, Promise<void>>();
let renderCount = 0;

// 図の配色。スライドの紺の背景に合わせた、パステル寄りの青系（共通ルールの「パステル寄り・低彩度」）
const SLIDE_BG = "#24365A";
const PASTELS = ["#DCE8FA", "#DDF3EA", "#FBE8D8", "#EDE3F7", "#FAF1C9", "#F7DDE6", "#D9F0F7", "#E6EBF2"];
const THEME_VARIABLES = {
  background: "transparent",
  fontFamily: "Noto Sans JP, sans-serif",
  fontSize: "26px",
  primaryColor: PASTELS[0],
  primaryTextColor: "#1F2A44",
  primaryBorderColor: "#9DB9E6",
  secondaryColor: PASTELS[1],
  tertiaryColor: PASTELS[2],
  lineColor: "#DDE3F0",
  textColor: "#F5F7FB",
  // 矢印の上の文字の下地を背景と同じ色で塗り、文字の部分だけ矢印の線が消えて見えるようにする
  edgeLabelBackground: SLIDE_BG,
  // シーケンス図
  actorBkg: PASTELS[0],
  actorBorder: "#9DB9E6",
  actorTextColor: "#1F2A44",
  signalColor: "#DDE3F0",
  signalTextColor: "#F5F7FB",
  noteBkgColor: PASTELS[4],
  noteTextColor: "#1F2A44",
  // 年表・マインドマップの枝ごとの色
  ...Object.fromEntries(PASTELS.flatMap((c, i) => [[`cScale${i}`, c], [`cScaleLabel${i}`, "#1F2A44"]])),
};

// 矢印の上の文字は明るい色にし、下地は背景と同じ色で塗る（文字の部分だけ矢印の線が消えて見える）
const THEME_CSS = `
  .edgeLabel text, .edgeLabel tspan, .edgeLabel .label text { fill: #F5F7FB !important; }
  .edgeLabel rect, .labelBkg { fill: ${SLIDE_BG} !important; opacity: 1 !important; }
`;

// 上から下へ流れる図の、矢印に付いた文字（A -->|文字| B）の描き方（2026-10-29 ユーザーの手描きの指示）。
// 中央の矢印からは文字を外して短くし（箱を大きく見せるため）、代わりに箱の右側に「A の右端 → 外へ → 下へ → B の右端」の
// カギ形の矢印を描いて、その右に文字を置く
type SideLabel = { from: string; to: string; text: string };

const SIDE_GAP = 18; // 箱の右端からカギ形の縦線まで
const SIDE_TEXT_GAP = 10; // カギ形の縦線から文字まで
const SIDE_FONT = 22;
const SIDE_SHIFT = 7;

// 矢印の文字を外した記法にする（"A -->|文字| B" → "A --> B"）
function takeEdgeLabels(code: string): { code: string; count: number } {
  let count = 0;
  const stripped = code.replace(/(--+>|==+>|-\.+->)(\s*)\|[^|]*\|/g, (_all, arrow: string, space: string) => {
    count++;
    return `${arrow}${space}`;
  });
  return { code: stripped, count };
}

// 文字つきの矢印が、どの箱からどの箱へか。文字ありで1度描いた図の data-id（"L_A_B_0"）から読む
function edgeEnds(svg: string): SideLabel[] {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  return [...doc.querySelectorAll("g.edgeLabel g.label[data-id]")].flatMap((g) => {
    const text = g.textContent?.trim();
    const m = g.getAttribute("data-id")?.match(/^L_(.+)_(.+)_\d+$/);
    return text && m ? [{ from: m[1], to: m[2], text }] : [];
  });
}

function nodeBox(doc: Document, id: string) {
  const node = [...doc.querySelectorAll("g.node")].find(
    (g) => g.getAttribute("data-id") === id || new RegExp(`-${id}-\\d+$`).test(g.id),
  );
  const m = node?.getAttribute("transform")?.match(/translate\(\s*([-\d.]+)[,\s]+([-\d.]+)\s*\)/);
  const shape = node?.querySelector("rect, polygon, path, circle");
  if (!node || !m || !shape) return null;
  const width = Number(shape.getAttribute("width") ?? 0) || 120;
  return { cx: Number(m[1]), cy: Number(m[2]), right: Number(m[1]) + width / 2 };
}

const SVG_NS = "http://www.w3.org/2000/svg";

function drawSideLabels(svg: string, sides: SideLabel[]): string {
  if (sides.length === 0) return svg;
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  const [vx, vy, vw, vh] = (root.getAttribute("viewBox") ?? "0 0 1 1").split(/[\s,]+/).map(Number);
  // 矢印の先の三角
  const defs = doc.createElementNS(SVG_NS, "defs");
  defs.innerHTML = `<marker id="side-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#DDE3F0"/></marker>`;
  root.appendChild(defs);
  let maxX = vx + vw;
  for (const side of sides) {
    const a = nodeBox(doc, side.from);
    const b = nodeBox(doc, side.to);
    if (!a || !b) continue;
    const x = Math.max(a.right, b.right) + SIDE_GAP;
    const path = doc.createElementNS(SVG_NS, "path");
    // 出る位置は箱の中央より少し下、入る位置は少し上にずらす（続けて並ぶカギ形の線がつながって見えないように）
    path.setAttribute("d", `M${a.right + 4},${a.cy + SIDE_SHIFT} H${x} V${b.cy - SIDE_SHIFT} H${b.right + 4}`);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#DDE3F0");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("marker-end", "url(#side-arrow)");
    root.appendChild(path);
    const text = doc.createElementNS(SVG_NS, "text");
    text.setAttribute("x", String(x + SIDE_TEXT_GAP));
    text.setAttribute("y", String((a.cy + b.cy) / 2));
    text.setAttribute("dominant-baseline", "middle");
    text.setAttribute("fill", "#F5F7FB");
    text.setAttribute("font-size", String(SIDE_FONT));
    text.setAttribute("font-family", "Noto Sans JP, sans-serif");
    text.textContent = side.text;
    root.appendChild(text);
    // 文字の幅は全角1文字＝文字の大きさとして見積もり、その分 viewBox を右へ広げる
    maxX = Math.max(maxX, x + SIDE_TEXT_GAP + [...side.text].length * SIDE_FONT + 8);
  }
  root.setAttribute("viewBox", `${vx} ${vy} ${maxX - vx} ${vh}`);
  return new XMLSerializer().serializeToString(root);
}

// mermaid は大きいので、図解のスライドを描くときだけ読み込む
async function mermaidSvg(code: string): Promise<string> {
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({
    startOnLoad: false,
    theme: "base",
    // 文字を HTML でなく SVG の文字で描く（HTML の文字が入った SVG は PNG に変えられないため）
    htmlLabels: false,
    themeVariables: THEME_VARIABLES,
    themeCSS: THEME_CSS,
    // 上下の箱の間は短めにする（矢印が長いと、枠に収めたとき箱が小さくなるため）
    flowchart: { curve: "basis", nodeSpacing: 40, rankSpacing: 28, padding: 20 },
  });
  return (await mermaid.render(`diagram-${++renderCount}`, code)).svg;
}

async function renderOnce(code: string): Promise<{ svg: string; w: number; h: number }> {
  let svg: string;
  const { code: plain, count } = takeEdgeLabels(code);
  if (/^\s*(flowchart|graph)\s+(TD|TB)\b/.test(code) && count > 0) {
    // 文字ありで1度描いてどの矢印の文字かを読み、文字なしで描き直して右側にカギ形の矢印を足す
    const sides = edgeEnds(await mermaidSvg(code));
    svg = drawSideLabels(await mermaidSvg(plain), sides);
  } else {
    svg = await mermaidSvg(code);
  }
  const [, , w, h] = (svg.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 1 1").split(/[\s,]+/).map(Number);
  return { svg, w, h };
}

// 枠に収めたときの拡大率（大きいほど図が大きく見える）
const fitScale = (d: { w: number; h: number }, box: TextBox) => Math.min(box.w / d.w, box.h / d.h);

// 図を描く。flowchart は左右（LR）と上下（TD）の両方で描き、枠に収めたとき大きく見える方を使う
// （図の枠は右側の縦長なので、横に並ぶ図は小さくなりやすい。2026-10-29 ユーザーの指示で上から下を基本にした）
async function renderSvg(code: string, box: TextBox): Promise<string> {
  const first = await renderOnce(code);
  const direction = /^(\s*(?:flowchart|graph)\s+)(LR|RL|TD|TB|BT)\b/;
  const m = code.match(direction);
  if (!m) return first.svg;
  const flipped = code.replace(direction, `$1${["LR", "RL"].includes(m[2]) ? "TD" : "LR"}`);
  const second = await renderOnce(flipped);
  return fitScale(second, box) > fitScale(first, box) ? second.svg : first.svg;
}

// SVG を、枠と同じ縦横比の透明な PNG にする（図は真ん中に、縦横比を保って収める）
async function svgToPng(svg: string, box: TextBox): Promise<Blob> {
  const width = Math.round(box.w * DIAGRAM_PX_PER_INCH);
  const height = Math.round(box.h * DIAGRAM_PX_PER_INCH);
  // mermaid の SVG は幅が 100% なので、画像として読めるよう viewBox の大きさを幅・高さに書く
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const el = doc.documentElement;
  const [, , vw, vh] = (el.getAttribute("viewBox") ?? "0 0 800 600").split(/[\s,]+/).map(Number);
  el.setAttribute("width", String(vw));
  el.setAttribute("height", String(vh));
  el.removeAttribute("style");
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(el))}`;
  await img.decode();
  const scale = Math.min(width / img.naturalWidth, height / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNGにできませんでした"))), "image/png"),
  );
}

// 描いた図を PNG にして Storage に保存する。同じ記法の画像がもうあれば、何もしない（409 は無視）
function savePng(code: string, svg: string, box: TextBox): Promise<void> {
  const key = diagramKey(code, box);
  const running = saving.get(key);
  if (running) return running;
  const task = uploadPng(code, svg, box).catch(() => {
    saving.delete(key); // 失敗したら次に描いたときにやり直す
  });
  saving.set(key, task);
  return task;
}

async function uploadPng(code: string, svg: string, box: TextBox) {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  const path = await diagramPath(data.user.id, code, box);
  const png = await svgToPng(svg, box);
  await supabase.storage.from(DIAGRAM_BUCKET).upload(path, png, { contentType: "image/png", upsert: false });
}

/**
 * スライドにある図解をすべて PNG にして保存し、終わるまで待つ。pptx を作る前に呼ぶ
 * （詳細画面を開いてすぐダウンロードしたときも、図が画像として入るようにするため）。
 * 記法が書き間違っていて描けない図は飛ばす（pptx には記法の文字が入る）
 */
export async function saveDiagrams(diagrams: { code: string; box: TextBox }[]): Promise<void> {
  await Promise.all(
    diagrams.map(async ({ code, box }) => {
      const running = saving.get(diagramKey(code, box));
      if (running) return running;
      try {
        await savePng(code, await renderSvg(code, box), box);
      } catch {
        // 描けない図は飛ばす
      }
    }),
  );
}

/**
 * 図解の置き方の図。Mermaid の記法から図を描いて枠に収め、pptx に貼るための PNG を保存する。
 * 記法が書き間違っていて描けないときは、その旨と記法の文字を出す（pptx にも記法の文字が入る）
 */
export function DiagramBox({ code, box, style }: { code: string; box: TextBox; style: CSSProperties }) {
  const [svg, setSvg] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    renderSvg(code, box)
      .then((result) => {
        if (cancelled) return;
        setSvg(result);
        setFailed(false);
        // 保存に失敗しても画面の図は出す（pptx には記法の文字が入る）
        savePng(code, result, box);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [code, box]);

  if (failed) {
    return (
      <div style={{ ...style, whiteSpace: "pre", fontFamily: "ui-monospace, monospace" }}>
        <p style={{ color: "#FCA5A5", whiteSpace: "normal" }}>図を描けませんでした（記法を確認してください）</p>
        {code}
      </div>
    );
  }
  return (
    <div
      style={{ ...style, alignItems: "center", justifyContent: "center" }}
      className="[&>svg]:h-full [&>svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
