import { describe, expect, it } from "vitest";
import { assembleSections, listSlideTopics } from "./research";

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
  it("スライドごとの箇条書きを、中項目・小項目の形に戻す。出典はスライドごとには持たない", () => {
    const outlines = [outline("A"), outline("B", ["B1", "B2"])];
    expect(assembleSections(outlines, [["a"], ["b1"], ["b2"]])).toEqual([
      { heading: "A", bullets: ["a"], sources: [] },
      {
        heading: "B",
        bullets: [],
        sources: [],
        subsections: [
          { heading: "B1", bullets: ["b1"], sources: [] },
          { heading: "B2", bullets: ["b2"], sources: [] },
        ],
      },
    ]);
  });
});
