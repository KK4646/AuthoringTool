import { describe, expect, it } from "vitest";
import { diagramHash, diagramPath } from "@/lib/slides/diagram";

describe("diagramPath", () => {
  it("同じ記法なら前後の空白が違っても同じ名前になり、違う記法なら別の名前になる", async () => {
    const a = await diagramPath("u1", "flowchart LR\n  A --> B");
    expect(a).toBe(await diagramPath("u1", "\nflowchart LR\n  A --> B\n"));
    expect(a).toMatch(/^u1\/[0-9a-f]{64}\.png$/);
    expect(await diagramHash("flowchart LR\n  A --> C")).not.toBe(a.slice(3, -4));
  });
});
