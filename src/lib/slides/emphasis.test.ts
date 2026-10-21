import { describe, expect, it } from "vitest";
import { markRange, splitRuns, stripMarks } from "./emphasis";

describe("splitRuns", () => {
  it("印の部分だけ色が付く", () => {
    expect(splitRuns("Aは[[yellow|重要]]です")).toEqual([
      { text: "Aは" },
      { text: "重要", color: "FFD966" },
      { text: "です" },
    ]);
  });
  it("印が無ければそのまま1つ", () => {
    expect(splitRuns("ただの文")).toEqual([{ text: "ただの文" }]);
    expect(splitRuns("")).toEqual([{ text: "" }]);
  });
  it("知らない色の名前は印として扱わない", () => {
    expect(splitRuns("[[pink|x]]")).toEqual([{ text: "[[pink|x]]" }]);
  });
  it("複数の印と、先頭・末尾の印", () => {
    expect(splitRuns("[[red|a]]b[[blue|c]]")).toEqual([
      { text: "a", color: "FF8A80" },
      { text: "b" },
      { text: "c", color: "8EC9FF" },
    ]);
  });
});

describe("stripMarks / markRange", () => {
  it("印を外す", () => {
    expect(stripMarks("Aは[[yellow|重要]]です")).toBe("Aは重要です");
  });
  it("範囲に色を付ける。範囲の中の印は付け直す", () => {
    expect(markRange("abcdef", 1, 3, "red")).toBe("a[[red|bc]]def");
    expect(markRange("a[[red|bc]]def", 0, 11, "green")).toBe("[[green|abc]]def");
  });
  it("空の範囲には何もしない", () => {
    expect(markRange("abc", 1, 1, "red")).toBe("abc");
  });
});
