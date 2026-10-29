import { describe, expect, it } from "vitest";
import { SAMPLE_DECK } from "@/lib/slides/download";
import { diagramItems, diagramPath, quoteEdgeLabels } from "@/lib/slides/diagram";
import { loadLayout } from "@/lib/slides/layout";
import type { TextBox } from "@/lib/slides/layout";

const box = { x: 0, y: 0, w: 6, h: 4 } as TextBox;

describe("diagramPath", () => {
  it("同じ記法・同じ枠なら前後の空白が違っても同じ名前、記法か枠の大きさが違えば別の名前", async () => {
    const a = await diagramPath("u1", "flowchart LR\n  A --> B", box);
    expect(a).toBe(await diagramPath("u1", "\nflowchart LR\n  A --> B\n", box));
    expect(a).toMatch(/^u1\/[0-9a-f]{64}\.png$/);
    expect(await diagramPath("u1", "flowchart LR\n  A --> C", box)).not.toBe(a);
    expect(await diagramPath("u1", "flowchart LR\n  A --> B", { ...box, w: 5 })).not.toBe(a);
  });
});

describe("diagramItems", () => {
  it("図解のある置き方のスライドだけ、その置き方の枠と一緒に拾う", () => {
    const layout = loadLayout();
    const items = diagramItems(SAMPLE_DECK, layout);
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) expect(item.code).not.toBe("");
  });
});

describe("quoteEdgeLabels", () => {
  it("矢印の文字を \"\" で囲み、囲んであるものはそのままにする", () => {
    expect(quoteEdgeLabels('A -->|int()| B -->|"str()"| C')).toBe('A -->|"int()"| B -->|"str()"| C');
  });
});
