import { describe, expect, it } from "vitest";
import { assembleSections, listSlideTopics, normalizeSlide } from "./research";

const outline = (heading: string, subheadings: string[] = []) => ({ heading, subheadings });

describe("listSlideTopics", () => {
  it("小項目が無い中項目は1枚、小項目があれば小項目ごとに1枚、の並びにする", () => {
    expect(listSlideTopics([outline("A"), outline("B", ["B1", "B2"]), outline("C")])).toEqual([
      { topic: "中項目「A」", heading: "A" },
      { topic: "中項目「B」の小項目「B1」", heading: "B1" },
      { topic: "中項目「B」の小項目「B2」", heading: "B2" },
      { topic: "中項目「C」", heading: "C" },
    ]);
  });
});

describe("assembleSections", () => {
  it("スライドごとの中身を、中項目・小項目の形に戻す。出典はスライドごとには持たない", () => {
    const outlines = [outline("A"), outline("B", ["B1", "B2"])];
    const bodies = [
      { layout: "content" as const, bullets: ["a"] },
      { layout: "two-content" as const, bullets: ["b1"], right: ["r"] },
      { layout: "content" as const, bullets: ["b2"] },
    ];
    expect(assembleSections(outlines, bodies)).toEqual([
      { heading: "A", layout: "content", bullets: ["a"], sources: [] },
      {
        heading: "B",
        bullets: [],
        sources: [],
        subsections: [
          { heading: "B1", layout: "two-content", bullets: ["b1"], right: ["r"], sources: [] },
          { heading: "B2", layout: "content", bullets: ["b2"], sources: [] },
        ],
      },
    ]);
  });
});

describe("normalizeSlide", () => {
  const raw = {
    layout: "content" as const,
    bullets: ["a"],
    right: [] as string[],
    leftLabel: "",
    rightLabel: "",
    caption: "",
    bubbles: [] as string[],
  };

  it("置き方で使う項目だけを残し、前後の空白と空の項目を落とし、上限で切る", () => {
    expect(
      normalizeSlide(
        { ...raw, layout: "comparison", bullets: [" a ", "", "b", "c"], right: ["x"], leftLabel: " A ", rightLabel: "B", caption: "使わない" },
        2,
      ),
    ).toEqual({ layout: "comparison", leftLabel: "A", bullets: ["a", "b"], rightLabel: "B", right: ["x"] });
  });

  it("比較の小見出しが無ければ2つのコンテンツ、右の段も無ければ1つのコンテンツにする", () => {
    expect(normalizeSlide({ ...raw, layout: "comparison", right: ["x"] }, 5)).toEqual({
      layout: "two-content",
      bullets: ["a"],
      right: ["x"],
    });
    expect(normalizeSlide({ ...raw, layout: "two-content" }, 5)).toEqual({ layout: "content", bullets: ["a"] });
  });

  it("説明文・吹き出しの文が空なら1つのコンテンツにする。吹き出しは2つまで", () => {
    expect(normalizeSlide({ ...raw, layout: "content-with-caption", caption: " " }, 5)).toEqual({
      layout: "content",
      bullets: ["a"],
    });
    expect(normalizeSlide({ ...raw, layout: "bubbles" }, 5)).toEqual({ layout: "content", bullets: ["a"] });
    expect(normalizeSlide({ ...raw, layout: "bubbles", bubbles: ["1", "2", "3"] }, 5)).toEqual({
      layout: "bubbles",
      bullets: ["a"],
      bubbles: ["1", "2"],
    });
  });
});
