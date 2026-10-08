import { describe, expect, it } from "vitest";
import { MAX_SECTIONS, parseSections, ResearchRequestSchema } from "./types";

describe("ResearchRequestSchema", () => {
  it("タイトルが空なら弾く", () => {
    const r = ResearchRequestSchema.safeParse({ title: "  ", sections: ["a"] });
    expect(r.success).toBe(false);
  });

  it("中項目が0個なら弾く", () => {
    const r = ResearchRequestSchema.safeParse({ title: "t", sections: [] });
    expect(r.success).toBe(false);
  });

  it("中項目が上限を超えたら弾く", () => {
    const sections = Array.from({ length: MAX_SECTIONS + 1 }, (_, i) => `項目${i}`);
    expect(ResearchRequestSchema.safeParse({ title: "t", sections }).success).toBe(false);
  });

  it("サブタイトルは省略でき、前後の空白は落とす", () => {
    const r = ResearchRequestSchema.parse({ title: " テーマ ", sections: [" A "] });
    expect(r).toEqual({ title: "テーマ", subtitle: "", sections: ["A"] });
  });
});

describe("parseSections", () => {
  it("正しい形ならそのまま読む", () => {
    const sections = [{ heading: "h", bullets: ["b"], sources: [{ title: "t", url: "u" }] }];
    expect(parseSections(sections)).toEqual(sections);
  });

  it("形が崩れていたら空にする", () => {
    expect(parseSections([{ heading: 1 }])).toEqual([]);
    expect(parseSections(null)).toEqual([]);
  });
});
