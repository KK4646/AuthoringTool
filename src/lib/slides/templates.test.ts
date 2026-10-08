import { describe, expect, it } from "vitest";
import { MAX_TEMPLATE_NAME, parseTemplateSections, SaveTemplateSchema } from "./templates";
import { MAX_SECTIONS } from "./types";

const outline = (heading: string, subheadings: string[] = []) => ({ heading, subheadings });

describe("SaveTemplateSchema", () => {
  it("名前の前後の空白を落とし、空欄の中項目・小項目は除く", () => {
    const r = SaveTemplateSchema.parse({
      name: " LT ",
      sections: [outline(" A ", [" A1 ", ""]), outline(""), outline("  "), outline("B")],
    });
    expect(r).toEqual({ name: "LT", sections: [outline("A", ["A1"]), outline("B")] });
  });

  it("名前が空・長すぎるなら弾く", () => {
    expect(SaveTemplateSchema.safeParse({ name: "  ", sections: [outline("A")] }).success).toBe(false);
    const long = "あ".repeat(MAX_TEMPLATE_NAME + 1);
    expect(SaveTemplateSchema.safeParse({ name: long, sections: [outline("A")] }).success).toBe(false);
  });

  it("空欄を除いて中項目が0個、または上限超えなら弾く", () => {
    expect(SaveTemplateSchema.safeParse({ name: "t", sections: [outline(" ")] }).success).toBe(false);
    const sections = Array.from({ length: MAX_SECTIONS + 1 }, (_, i) => outline(`項目${i}`));
    expect(SaveTemplateSchema.safeParse({ name: "t", sections }).success).toBe(false);
  });
});

describe("parseTemplateSections", () => {
  it("小項目つきの形も、小項目を足す前の文字列の配列も読む", () => {
    expect(parseTemplateSections([outline("a", ["a1"])])).toEqual([outline("a", ["a1"])]);
    expect(parseTemplateSections(["a", "b"])).toEqual([outline("a"), outline("b")]);
  });

  it("形が崩れていたら空にする", () => {
    expect(parseTemplateSections([1])).toEqual([]);
    expect(parseTemplateSections(null)).toEqual([]);
  });
});
