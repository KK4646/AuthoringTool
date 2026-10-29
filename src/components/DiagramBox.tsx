"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { DIAGRAM_BUCKET, DIAGRAM_PX_PER_INCH, diagramPath } from "@/lib/slides/diagram";
import type { TextBox } from "@/lib/slides/layout";
import { createClient } from "@/lib/supabase/client";

// 同じ画面で同じ図を何度も保存しに行かないよう、保存を試した記法を覚えておく
const saved = new Set<string>();
let renderCount = 0;

// mermaid は大きいので、図解のスライドを描くときだけ読み込む
async function renderSvg(code: string): Promise<string> {
  const mermaid = (await import("mermaid")).default;
  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    // 文字を HTML でなく SVG の文字で描く（HTML の文字が入った SVG は PNG に変えられないため）
    htmlLabels: false,
    themeVariables: { background: "transparent", fontFamily: "Noto Sans JP, sans-serif" },
  });
  const { svg } = await mermaid.render(`diagram-${++renderCount}`, code);
  return svg;
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
async function savePng(code: string, svg: string, box: TextBox) {
  if (saved.has(code)) return;
  saved.add(code);
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  const path = await diagramPath(data.user.id, code);
  const png = await svgToPng(svg, box);
  await supabase.storage.from(DIAGRAM_BUCKET).upload(path, png, { contentType: "image/png", upsert: false });
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
    renderSvg(code)
      .then((result) => {
        if (cancelled) return;
        setSvg(result);
        setFailed(false);
        // 保存に失敗しても画面の図は出す（pptx には記法の文字が入る）
        savePng(code, result, box).catch(() => saved.delete(code));
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
