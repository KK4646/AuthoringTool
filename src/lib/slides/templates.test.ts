import { describe, expect, it } from "vitest";
import { MAX_TEMPLATE_NAME, parseHeadings, SaveTemplateSchema } from "./templates";
import { MAX_SECTIONS } from "./types";

describe("SaveTemplateSchema", () => {
  it("名前の前後の空白を落とし、空欄の中項目は除く", () => {
    const r = SaveTemplateSchema.parse({ name: " LT ", headings: [" A ", "", "  ", "B"] });
    expect(r).toEqual({ name: "LT", headings: ["A", "B"] });
  });

  it("名前が空・長すぎるなら弾く", () => {
    expect(SaveTemplateSchema.safeParse({ name: "  ", headings: ["A"] }).success).toBe(false);
    const long = "あ".repeat(MAX_TEMPLATE_NAME + 1);
    expect(SaveTemplateSchema.safeParse({ name: long, headings: ["A"] }).success).toBe(false);
  });

  it("空欄を除いて中項目が0個、または上限超えなら弾く", () => {
    expect(SaveTemplateSchema.safeParse({ name: "t", headings: ["", " "] }).success).toBe(false);
    const headings = Array.from({ length: MAX_SECTIONS + 1 }, (_, i) => `項目${i}`);
    expect(SaveTemplateSchema.safeParse({ name: "t", headings }).success).toBe(false);
  });
});

describe("parseHeadings", () => {
  it("文字列の配列ならそのまま読み、形が崩れていたら空にする", () => {
    expect(parseHeadings(["a", "b"])).toEqual(["a", "b"]);
    expect(parseHeadings([1])).toEqual([]);
    expect(parseHeadings(null)).toEqual([]);
  });
});
