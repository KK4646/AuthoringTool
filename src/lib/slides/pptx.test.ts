import { describe, expect, it } from "vitest";
import { buildPptx } from "./pptx";
import { SAMPLE_DECK } from "./download";
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
      sources: [],
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
      sources: [],
      sections: [
        { heading: "A", bullets: ["a"], sources: many.slice(0, 10) },
        { heading: "B", bullets: ["b"], sources: many.slice(5) }, // 5件は重複
      ],
    };
    // 出典は重複を除いて15件 → 12件/枚なので2枚
    expect(slideCount(await buildPptx(deck))).toBe(2 + 2 + 2);
  });

  it("全体の出典と、古い履歴の中項目ごとの出典を合わせて出典スライドに載せる", async () => {
    const many = Array.from({ length: 15 }, (_, i) => source(i));
    const deck: Deck = {
      title: "テスト",
      subtitle: "",
      sources: many.slice(0, 10),
      sections: [{ heading: "A", bullets: ["a"], sources: many.slice(5) }], // 5件は重複
    };
    // 表紙1 + 目次1 + 本文1 + 出典（15件 → 12件/枚なので2枚）
    expect(slideCount(await buildPptx(deck))).toBe(5);
  });

  it("小項目のある中項目は、区切り1枚と小項目ごとの本文を作り、小項目の出典も集める", async () => {
    const deck: Deck = {
      title: "テスト",
      subtitle: "",
      sources: [],
      sections: [
        { heading: "A", bullets: ["a"], sources: [] },
        {
          heading: "B",
          bullets: [],
          sources: [],
          subsections: [
            { heading: "B1", bullets: ["b1"], sources: [source(1)] },
            { heading: "B2", bullets: ["b2"], sources: [source(2)] },
          ],
        },
      ],
    };
    // 表紙1 + 目次1 + A 1 + B の区切り1 + 小項目2 + 出典1
    expect(slideCount(await buildPptx(deck))).toBe(7);
  });

  it("サンプルは置き方ごとに1枚ずつ本文を作る", async () => {
    // 表紙1 + 目次1 + 本文7（置き方7種類）+ 区切り1 + 小項目1 + 出典1
    expect(slideCount(await buildPptx(SAMPLE_DECK))).toBe(12);
  });

  it("置き方の枠にある項目だけを書く（1段の置き方では右の段を書かない）", async () => {
    const deck = (layout: "content" | "two-content"): Deck => ({
      title: "テスト",
      subtitle: "",
      sources: [],
      sections: [{ heading: "A", layout, bullets: ["左の段"], right: ["右の段だけの文"], sources: [] }],
    });
    const has = (buf: Buffer, text: string) => buf.includes(Buffer.from(text));
    expect(has(await buildPptx(deck("two-content")), "右の段だけの文")).toBe(true);
    expect(has(await buildPptx(deck("content")), "右の段だけの文")).toBe(false);
  });

  it("出典が無ければ出典スライドは作らない", async () => {
    const deck: Deck = {
      title: "テスト",
      subtitle: "",
      sources: [],
      sections: [{ heading: "A", bullets: ["a"], sources: [] }],
    };
    expect(slideCount(await buildPptx(deck))).toBe(3);
  });
});
