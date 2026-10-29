import { describe, expect, it } from "vitest";
import { loadLayout } from "@/lib/slides/layout";
import { contentSlideItems, flexDiagramLayout } from "@/lib/slides/render";

describe("flexDiagramLayout", () => {
  const c = loadLayout().layouts.diagram;
  const slide = (bullets: string[]) => ({ heading: "h", bullets, sources: [], layout: "diagram" as const, diagram: "x" });

  it("短い文なら左の段を狭め、図を広げる。長い文なら左を広げる", () => {
    const short = flexDiagramLayout(c, slide(["短い"]));
    const long = flexDiagramLayout(c, slide(["文字列の数を整数に変換して計算する（全角二十文字）"]));
    expect(short.body!.w).toBe(3.0);
    expect(long.body!.w).toBeGreaterThan(short.body!.w);
    expect(long.diagram!.w).toBeLessThan(short.diagram!.w);
    // 図の右端はそろう
    expect(short.diagram!.x + short.diagram!.w).toBeCloseTo(long.diagram!.x + long.diagram!.w);
  });

  it("左の段は7インチより広げない", () => {
    expect(flexDiagramLayout(c, slide(["あ".repeat(60)])).body!.w).toBe(7.0);
  });
});

describe("contentSlideItems（文字の大きさの調整）", () => {
  const layout = loadLayout();
  const sizeOf = (items: ReturnType<typeof contentSlideItems>, key: string) => items.find((i) => i.key === key)!.box.fontSize;

  it("短い箇条書きは設定より大きくし、長い箇条書きは設定のまま", () => {
    const base = layout.layouts.content.body!.fontSize;
    const short = contentSlideItems(layout.layouts.content, { heading: "h", bullets: ["短い", "文"], sources: [] });
    const long = contentSlideItems(layout.layouts.content, { heading: "h", bullets: ["あ".repeat(45)], sources: [] });
    expect(sizeOf(short, "body")).toBeGreaterThan(base);
    expect(sizeOf(long, "body")).toBe(base);
  });

  it("コードの置き方は、コード枠を説明のすぐ下に行数ぶんの高さで置く", () => {
    const c = layout.layouts.code;
    const items = contentSlideItems(c, { heading: "h", layout: "code", bullets: ["説明"], code: "a = 1\nb = 2", sources: [] });
    const code = items.find((i) => i.key === "code")!.box;
    expect(code.y).toBeLessThan(c.code!.y);
    expect(code.h).toBeLessThan(c.code!.h);
  });
});
