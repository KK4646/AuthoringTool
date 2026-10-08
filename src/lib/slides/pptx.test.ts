import { describe, expect, it } from "vitest";
import { buildPptx } from "./pptx";
import type { Deck } from "./types";

// zip の中のスライドファイル名を数える
function slideCount(buffer: Buffer): number {
  const names = buffer.toString("latin1").match(/ppt\/slides\/slide\d+\.xml/g) ?? [];
  return new Set(names).size;
}

const source = (i: number) => ({ title: `出典${i}`, url: `https://example.com/${i}` });

describe("buildPptx", () => {
  it("表紙・目次・中項目ごと・出典の順に枚数ができる", async () => {
    const deck: Deck = {
      title: "テスト",
      subtitle: "",
      sections: [
        { heading: "A", bullets: ["a"], sources: [source(1)] },
        { heading: "B", bullets: ["b"], sources: [] },
      ],
    };
    // 表紙1 + 目次1 + 本文2 + 出典1
    expect(slideCount(await buildPptx(deck))).toBe(5);
  });

  it("出典が1枚に入りきらなければ分け、同じURLは1件にまとめる", async () => {
    const many = Array.from({ length: 15 }, (_, i) => source(i));
    const deck: Deck = {
      title: "テスト",
      subtitle: "サブ",
      sections: [
        { heading: "A", bullets: ["a"], sources: many.slice(0, 10) },
        { heading: "B", bullets: ["b"], sources: many.slice(5) }, // 5件は重複
      ],
    };
    // 出典は重複を除いて15件 → 12件/枚なので2枚
    expect(slideCount(await buildPptx(deck))).toBe(2 + 2 + 2);
  });

  it("出典が無ければ出典スライドは作らない", async () => {
    const deck: Deck = {
      title: "テスト",
      subtitle: "",
      sections: [{ heading: "A", bullets: ["a"], sources: [] }],
    };
    expect(slideCount(await buildPptx(deck))).toBe(3);
  });
});
