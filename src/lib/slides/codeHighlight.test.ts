import { describe, expect, it } from "vitest";
import { CODE_COLORS, codeLines } from "@/lib/slides/codeHighlight";

describe("codeLines", () => {
  it("行番号を桁をそろえて付け、語の種類ごとに色を分ける", () => {
    const code = Array.from({ length: 10 }, (_, i) => (i === 0 ? 'const n = sum(1, "a"); // 合計' : "x")).join("\n");
    const lines = codeLines(code);
    expect(lines[0].number).toBe(" 1");
    expect(lines[9].number).toBe("10");
    const color = (text: string) => lines[0].runs.find((r) => r.text.includes(text))?.color;
    expect(color("const")).toBe(CODE_COLORS.keyword);
    expect(color("sum")).toBe(CODE_COLORS.func);
    expect(color("1")).toBe(CODE_COLORS.number);
    expect(color('"a"')).toBe(CODE_COLORS.string);
    expect(color("// 合計")).toBe(CODE_COLORS.comment);
    expect(lines[0].runs.map((r) => r.text).join("")).toBe('const n = sum(1, "a"); // 合計');
  });

  it("字下げの空白は消さない", () => {
    expect(codeLines("if (a) {\n    b();\n}")[1].runs.map((r) => r.text).join("")).toBe("    b();");
  });
});
