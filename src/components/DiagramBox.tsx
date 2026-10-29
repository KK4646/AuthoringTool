"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { DIAGRAM_BUCKET, DIAGRAM_PX_PER_INCH, diagramKey, diagramPath, quoteEdgeLabels } from "@/lib/slides/diagram";
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
// 矢印は太く、パステルの青で丸みを付ける（細い灰色の線だと質素に見えるため。2026-10-29 ユーザーの指示）
const ARROW_COLOR = "#A9C4EE";
const THEME_CSS = `
  .flowchart-link, .messageLine0, .messageLine1 { stroke: ${ARROW_COLOR} !important; stroke-width: 3.5px !important; stroke-linecap: round; }
  .marker, marker path, .arrowheadPath { fill: ${ARROW_COLOR} !important; stroke: ${ARROW_COLOR} !important; }
  .node rect, .node polygon, .node circle, .actor { rx: 10px; ry: 10px; stroke-width: 2px !important; }
  text, tspan, .nodeLabel { font-weight: 700 !important; }
  .edgeLabel text, .edgeLabel tspan, .edgeLabel .label text { fill: #F5F7FB !important; }
  .edgeLabel rect, .labelBkg { fill: ${SLIDE_BG} !important; opacity: 1 !important; }
`;

// 上から下へ流れる図の、矢印に付いた文字（A -->|文字| B）の描き方（2026-10-29 ユーザーの手描きの指示）。
// 中央の矢印からは文字を外して短くし（箱を大きく見せるため）、代わりに箱の右側に「A の右端 → 外へ → 下へ → B の右端」の
// カギ形の矢印を描いて、その右に文字を置く
type SideLabel = { from: string; to: string; text: string };

const SIDE_GAP = 40; // 箱の右端からカギ形の縦線まで
const SIDE_TEXT_GAP = 12; // カギ形の縦線から文字まで
const SIDE_FONT = 22;
const SIDE_SHIFT = 0.28; // 箱の高さに対する、中央からのずれ
const SIDE_RADIUS = 8; // カギ形の角の丸み

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

// 全部の矢印がどの箱からどの箱へか（"L_A_B_0" の形の id）
function allEdges(svg: string): { from: string; to: string }[] {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  return [...doc.querySelectorAll("path.flowchart-link")].flatMap((p) => {
    const m = (p.getAttribute("data-id") ?? p.id).match(/^L_(.+)_(.+)_\d+$/);
    return m ? [{ from: m[1], to: m[2] }] : [];
  });
}

// 一本道（どの箱からも出る矢印・入る矢印が1本まで）か。分かれ道や戻る矢印のある図では、カギ形にすると
// 線が入り組むので、文字は矢印の上のままにする
function isChain(edges: { from: string; to: string }[]): boolean {
  const from = new Set(edges.map((e) => e.from));
  const to = new Set(edges.map((e) => e.to));
  // 最初から最後へ戻る矢印があると、矢印の入らない箱（始まり）が無くなる
  const hasStart = [...from].some((id) => !to.has(id));
  return from.size === edges.length && to.size === edges.length && hasStart;
}

function nodeBox(doc: Document, id: string) {
  const node = [...doc.querySelectorAll("g.node")].find(
    (g) => g.getAttribute("data-id") === id || new RegExp(`-${id}-\\d+$`).test(g.id),
  );
  const m = node?.getAttribute("transform")?.match(/translate\(\s*([-\d.]+)[,\s]+([-\d.]+)\s*\)/);
  const shape = node?.querySelector("rect, polygon, path, circle");
  if (!node || !m || !shape) return null;
  const width = Number(shape.getAttribute("width") ?? 0) || 120;
  const height = Number(shape.getAttribute("height") ?? 0) || 50;
  return { cx: Number(m[1]), cy: Number(m[2]), right: Number(m[1]) + width / 2, h: height };
}

const SVG_NS = "http://www.w3.org/2000/svg";

// 文字の実際の幅（SVG の単位）。図の文字と同じ太さ・大きさ・書体で測る
function measureText(text: string): number {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return [...text].length * SIDE_FONT;
  ctx.font = `700 ${SIDE_FONT}px "Noto Sans JP", sans-serif`;
  return ctx.measureText(text).width;
}

function drawSideLabels(svg: string, sides: SideLabel[]): string {
  if (sides.length === 0) return svg;
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  const [vx, vy, vw, vh] = (root.getAttribute("viewBox") ?? "0 0 1 1").split(/[\s,]+/).map(Number);
  // 矢印の先の三角
  const defs = doc.createElementNS(SVG_NS, "defs");
  defs.innerHTML = `<marker id="side-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${ARROW_COLOR}"/></marker>`;
  root.appendChild(defs);
  let maxX = vx + vw;
  for (const side of sides) {
    const a = nodeBox(doc, side.from);
    const b = nodeBox(doc, side.to);
    if (!a || !b) continue;
    const x = Math.max(a.right, b.right) + SIDE_GAP;
    const path = doc.createElementNS(SVG_NS, "path");
    // 出る位置は箱の下寄り、入る位置は上寄りにする。続けて並ぶカギ形が1本につながって見えないよう、
    // 同じ箱に入る線と出る線の間をあける
    const y1 = a.cy + a.h * SIDE_SHIFT;
    const y2 = b.cy - b.h * SIDE_SHIFT;
    path.setAttribute("d", `M${a.right + 2},${y1} H${x - SIDE_RADIUS} Q${x},${y1} ${x},${y1 + SIDE_RADIUS} V${y2 - SIDE_RADIUS} Q${x},${y2} ${x - SIDE_RADIUS},${y2} H${b.right + 5}`);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", ARROW_COLOR);
    path.setAttribute("stroke-width", "3.5");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("marker-end", "url(#side-arrow)");
    root.appendChild(path);
    const text = doc.createElementNS(SVG_NS, "text");
    text.setAttribute("y", String((a.cy + b.cy) / 2));
    text.setAttribute("dominant-baseline", "central");
    text.setAttribute("fill", "#F5F7FB");
    text.setAttribute("font-size", String(SIDE_FONT));
    text.setAttribute("font-family", "Noto Sans JP, sans-serif");
    text.setAttribute("font-weight", "700");
    text.textContent = side.text;
    // 文字はカギ形の縦線の右に、少し離して置く（下地は敷かない。2026-10-29 ユーザーの指示）
    const textX = x + SIDE_TEXT_GAP;
    text.setAttribute("x", String(textX));
    text.setAttribute("text-anchor", "start");
    root.appendChild(text);
    maxX = Math.max(maxX, textX + measureText(side.text) + 4);
  }
  root.setAttribute("viewBox", `${vx} ${vy} ${maxX - vx} ${vh}`);
  return new XMLSerializer().serializeToString(root);
}

// 箱の中の文字を、箱のまん中にそろえ直す（mermaid は太字にする前の幅・高さで位置を決めるので、少しずれるため）。
// 文字の塊を箱の中心に置き、行ごとに左右中央・上下は全行の真ん中が中心に来るように並べる
function centerNodeLabels(svg: string): string {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  doc.querySelectorAll("g.node").forEach((node) => {
    const label = node.querySelector(":scope > g.label");
    const text = label?.querySelector("text");
    if (!label || !text) return;
    // 箱の形が rect ならその中心、それ以外（ひし形・円柱など）は node の原点を中心とみなす
    const rect = node.querySelector(":scope > rect.label-container");
    const cx = rect ? Number(rect.getAttribute("x")) + Number(rect.getAttribute("width")) / 2 : 0;
    const cy = rect ? Number(rect.getAttribute("y")) + Number(rect.getAttribute("height")) / 2 : 0;
    label.setAttribute("transform", `translate(${cx}, ${cy})`);
    text.setAttribute("x", "0");
    text.setAttribute("y", "0");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    const rows = [...text.querySelectorAll(":scope > tspan.row")];
    rows.forEach((row, i) => {
      row.setAttribute("x", "0");
      row.setAttribute("text-anchor", "middle");
      row.removeAttribute("y");
      // 1行目は全体の高さの半分だけ上へ、2行目からは1行ずつ下へ
      row.setAttribute("dy", i === 0 ? `${-(rows.length - 1) * 0.55}em` : "1.1em");
    });
  });
  return new XMLSerializer().serializeToString(doc.documentElement);
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
    flowchart: { curve: "basis", nodeSpacing: 40, rankSpacing: 28, padding: 20, wrappingWidth: 320 },
  });
  const svg = (await mermaid.render(`diagram-${++renderCount}`, code)).svg;
  return /^\s*(flowchart|graph)\b/.test(code) ? centerNodeLabels(svg) : svg;
}

async function renderOnce(source: string): Promise<{ svg: string; w: number; h: number }> {
  const code = quoteEdgeLabels(source);
  let svg: string;
  const { code: plain, count } = takeEdgeLabels(code);
  if (/^\s*(flowchart|graph)\s+(TD|TB)\b/.test(code) && count > 0) {
    // 文字ありで1度描いてどの矢印の文字かを読み、一本道なら文字なしで描き直して右側にカギ形の矢印を足す
    const labeled = await mermaidSvg(code);
    svg = isChain(allEdges(labeled)) ? drawSideLabels(await mermaidSvg(plain), edgeEnds(labeled)) : labeled;
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

// SVG を、枠と同じ縦横比の透明な PNG にする（縦横比を保って収め、上下は真ん中・左右は右寄せ。
// 右端の空きをなくし、左の箇条書きとの間を広く取るため。2026-10-29 ユーザーの指示）
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
  canvas.getContext("2d")!.drawImage(img, width - w, (height - h) / 2, w, h);
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
      style={{ ...style, alignItems: "flex-end", justifyContent: "center" }}
      className="[&>svg]:h-full [&>svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
