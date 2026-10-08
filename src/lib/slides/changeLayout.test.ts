import { describe, expect, it } from "vitest";
import { changeLayout } from "./changeLayout";

const slide = (bullets: string[], right?: string[]) => ({ heading: "A", bullets, right, sources: [] });

describe("changeLayout", () => {
  it("1段から2段にすると、箇条書きを前半（左）と後半（右）に分ける", () => {
    expect(changeLayout(slide(["1", "2", "3"]), "two-content")).toEqual({
      heading: "A",
      layout: "two-content",
      bullets: ["1", "2"],
      right: ["3"],
      sources: [],
    });
  });

  it("2段から1段にすると、右の段を左の段の後ろにつなげる", () => {
    expect(changeLayout({ ...slide(["1"], ["2", "3"]), layout: "comparison" }, "content")).toEqual({
      heading: "A",
      layout: "content",
      bullets: ["1", "2", "3"],
      right: undefined,
      sources: [],
    });
  });

  it("2段どうしは振り分けを変えず、他の項目（説明文・コードなど）は残す", () => {
    const two = { ...slide(["1"], ["2"]), layout: "two-content" as const, caption: "説明", code: "x" };
    expect(changeLayout(two, "comparison")).toEqual({ ...two, layout: "comparison" });
    expect(changeLayout({ ...slide(["1"]), caption: "説明" }, "title-only")).toEqual({
      ...slide(["1"]),
      caption: "説明",
      layout: "title-only",
    });
  });
});
