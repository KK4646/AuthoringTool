import { describe, expect, it } from "vitest";
import {
  countContentSlides,
  MAX_CONTENT_SLIDES,
  MAX_SECTIONS,
  MAX_SUBSECTIONS,
  parseSections,
  ResearchRequestSchema,
} from "./types";

const outline = (heading: string, subheadings: string[] = []) => ({ heading, subheadings });

describe("ResearchRequestSchema", () => {
  it("タイトルが空なら弾く", () => {
    const r = ResearchRequestSchema.safeParse({ title: "  ", sections: [outline("a")] });
    expect(r.success).toBe(false);
  });

  it("中項目が0個（空欄だけを含む）なら弾く", () => {
    expect(ResearchRequestSchema.safeParse({ title: "t", sections: [] }).success).toBe(false);
    const blank = ResearchRequestSchema.safeParse({ title: "t", sections: [outline(" ", ["x"])] });
    expect(blank.success).toBe(false);
  });

  it("中項目が上限を超えたら弾く", () => {
    const sections = Array.from({ length: MAX_SECTIONS + 1 }, (_, i) => outline(`項目${i}`));
    expect(ResearchRequestSchema.safeParse({ title: "t", sections }).success).toBe(false);
  });

  it("サブタイトル・小項目は省略でき、前後の空白と空欄の小項目は落とす", () => {
    const r = ResearchRequestSchema.parse({
      title: " テーマ ",
      sections: [{ heading: " A " }, outline("B", [" B1 ", "", " "])],
    });
    expect(r).toEqual({
      title: "テーマ",
      subtitle: "",
      sections: [outline("A"), outline("B", ["B1"])],
    });
  });

  it("1つの中項目の小項目が上限を超えたら弾く", () => {
    const subs = Array.from({ length: MAX_SUBSECTIONS + 1 }, (_, i) => `小${i}`);
    expect(ResearchRequestSchema.safeParse({ title: "t", sections: [outline("A", subs)] }).success).toBe(false);
  });

  it("本文スライドの合計が上限を超えたら弾く（小項目のある中項目は小項目の数で数える）", () => {
    const subs = Array.from({ length: MAX_SUBSECTIONS }, (_, i) => `小${i}`);
    const full = Array.from({ length: MAX_CONTENT_SLIDES / MAX_SUBSECTIONS }, (_, i) => outline(`中${i}`, subs));
    expect(ResearchRequestSchema.safeParse({ title: "t", sections: full }).success).toBe(true);
    const over = [...full, outline("もう1つ")];
    expect(ResearchRequestSchema.safeParse({ title: "t", sections: over }).success).toBe(false);
  });
});

describe("countContentSlides", () => {
  it("小項目が無ければ1枚、あれば小項目の数", () => {
    expect(countContentSlides([outline("A"), outline("B", ["1", "2", "3"])])).toBe(4);
  });
});

describe("parseSections", () => {
  it("正しい形ならそのまま読む", () => {
    const sections = [{ heading: "h", bullets: ["b"], sources: [{ title: "t", url: "u" }] }];
    expect(parseSections(sections)).toEqual(sections);
  });

  it("小項目の無い古い履歴も、小項目のある新しい形も読める", () => {
    const old = [{ heading: "h", bullets: ["b"], sources: [] }];
    expect(parseSections(old)).toEqual(old);
    const withSubs = [
      { heading: "h", bullets: [], sources: [], subsections: [{ heading: "s", bullets: ["b"], sources: [] }] },
    ];
    expect(parseSections(withSubs)).toEqual(withSubs);
  });

  it("形が崩れていたら空にする", () => {
    expect(parseSections([{ heading: 1 }])).toEqual([]);
    expect(parseSections(null)).toEqual([]);
  });
});
