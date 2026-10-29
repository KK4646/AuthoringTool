"use client";

import type { CSSProperties, RefObject } from "react";
import { DiagramBox } from "@/components/DiagramBox";
import { splitRuns } from "@/lib/slides/emphasis";
import type { TextBox } from "@/lib/slides/layout";
import type { RenderedSlide, SlideItem } from "@/lib/slides/render";

// スライドの大きさ（インチ）。config/layout.json の座標はこの比率で % に直す
const SLIDE_W = 13.333;
const SLIDE_H = 7.5;

// pt の文字サイズを、スライドの幅に対する割合（cqw）にする。1pt = 1/72 インチ
const fontSize = (pt: number) => `${((pt / 72 / SLIDE_W) * 100).toFixed(3)}cqw`;

const VALIGN: Record<TextBox["valign"], CSSProperties["justifyContent"]> = {
  top: "flex-start",
  middle: "center",
  bottom: "flex-end",
};

function boxStyle(box: TextBox): CSSProperties {
  return {
    position: "absolute",
    left: `${(box.x / SLIDE_W) * 100}%`,
    top: `${(box.y / SLIDE_H) * 100}%`,
    width: `${(box.w / SLIDE_W) * 100}%`,
    height: `${(box.h / SLIDE_H) * 100}%`,
    fontSize: fontSize(box.fontSize),
    color: `#${box.color}`,
    fontWeight: box.bold ? 700 : 400,
    textAlign: box.align,
    display: "flex",
    flexDirection: "column",
    justifyContent: VALIGN[box.valign],
    lineHeight: 1.25,
    // pptx の既定の内側の余白（0.1インチ・0.05インチ）に合わせる
    padding: `${(0.05 / SLIDE_H) * 100}cqh ${(0.1 / SLIDE_W) * 100}cqw`,
    overflow: "hidden",
    ...(box.fill ? { backgroundColor: `#${box.fill}` } : {}),
    ...(box.fontFace ? { fontFamily: `"${box.fontFace}", ui-monospace, monospace`, whiteSpace: "pre" } : {}),
  };
}

// [[色|語]] の印を色に変えて出す。編集中は span に data-color を持たせ、保存時に読み戻す
function Runs({ text }: { text: string }) {
  return (
    <>
      {splitRuns(text).map((run, i) => {
        const key = run.color ? run.key : undefined;
        return key ? (
          <span key={i} data-color={key} style={{ color: `#${run.color}` }}>
            {run.text}
          </span>
        ) : (
          <span key={i}>{run.text}</span>
        );
      })}
    </>
  );
}

/**
 * スライド1枚のプレビュー。背景画像の上に、config/layout.json の位置に文字を置く。
 * 文字の大きさは幅に比例させるので、どの幅で出しても見た目は同じ。
 * editing のときは文字枠が contentEditable になり、rootRef から中身を読み戻せる（editDom.ts）。
 * pptx の「あふれたら縮小」は再現しないので、あふれた分は切れて見える。
 */
export function SlidePreview({
  slide,
  editing = false,
  rootRef,
}: {
  slide: RenderedSlide;
  editing?: boolean;
  rootRef?: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={rootRef}
      className="relative w-full select-text overflow-hidden rounded-md shadow-[var(--shadow-card)] [container-type:size]"
      style={{
        aspectRatio: "16 / 9",
        backgroundColor: `#${slide.backgroundColor}`,
        backgroundImage: `url(/${slide.background})`,
        backgroundSize: "cover",
        fontFamily: "var(--font-noto-sans-jp), sans-serif",
      }}
    >
      {slide.items.map((item) => (
        <Box key={item.key} item={item} editing={editing} />
      ))}
    </div>
  );
}

function Box({ item, editing }: { item: SlideItem; editing: boolean }) {
  const editable = editing
    ? {
        contentEditable: true,
        suppressContentEditableWarning: true,
        "data-key": item.key,
        className: "outline-dashed outline-1 outline-white/60 focus:outline-white",
      }
    : {};
  // 図解の図。編集中は記法を文字のまま直せるようにする
  if (item.kind === "text" && item.key === "diagram" && !editing) {
    return <DiagramBox code={item.text} box={item.box} style={boxStyle(item.box)} />;
  }
  if (item.kind === "text") {
    return (
      <div style={boxStyle(item.box)}>
        <div {...editable} style={{ whiteSpace: "pre-wrap", minHeight: "1em" }}>
          <Runs text={item.text} />
        </div>
      </div>
    );
  }
  // 箇条書き。1項目を1つの div にし、点は疑似要素で描く（編集で読み戻すとき文字に混ざらないように）
  // 中身が空の枠は、書き込めるよう空の1行を置く。点は付けない（箇条書きがあるように見えて紛らわしいため）
  const placeholder = editing && item.lines.length === 0;
  const lines = placeholder ? [""] : item.lines;
  return (
    <div style={boxStyle(item.box)}>
      <div {...editable} style={{ minHeight: "1em" }}>
        {lines.map((line, i) => (
          <div
            key={i}
            className={item.bullet && !placeholder ? "relative pl-[1.1em] before:absolute before:left-[0.2em] before:content-['•']" : ""}
            style={{ marginBottom: fontSize(item.bullet ? 8 : 4), whiteSpace: "pre-wrap" }}
          >
            <Runs text={line} />
          </div>
        ))}
      </div>
    </div>
  );
}
