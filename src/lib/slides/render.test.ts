import { describe, expect, it } from "vitest";
import { loadLayout } from "@/lib/slides/layout";
import { flexDiagramLayout } from "@/lib/slides/render";

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
