import {
  LARGE_DOCUMENT,
  countJsonNodes,
  getJsonDepth,
  largeDocumentNote,
} from "../limits";
import { buildGraph } from "../../app/editor/components/Visualizers/graph/buildGraph";

describe("countJsonNodes", () => {
  it("matches the number of nodes the graph actually draws", () => {
    const docs: unknown[] = [
      { a: 1 },
      { a: { b: { c: 1 } } },
      { items: [{ x: 1 }, { x: 2 }], tags: ["a", "b"] },
      { mix: [1, { a: 1 }, [2]] },
      [{ a: 1 }, 2, [3]],
      "hello",
      [],
    ];
    for (const doc of docs) {
      expect(countJsonNodes(doc)).toBe(buildGraph(doc).nodes.length);
    }
  });
});

describe("getJsonDepth", () => {
  it("counts nesting levels", () => {
    expect(getJsonDepth(1)).toBe(0);
    expect(getJsonDepth({})).toBe(1);
    expect(getJsonDepth({ a: { b: [1] } })).toBe(3);
  });
});

describe("largeDocumentNote", () => {
  const rows = (n: number) =>
    JSON.stringify({ rows: Array.from({ length: n }, (_, i) => ({ id: i })) });

  it("says nothing about ordinary files", () => {
    expect(largeDocumentNote('{"a":1}')).toBeNull();
    expect(largeDocumentNote(rows(LARGE_DOCUMENT.NODES - 1))).toBeNull();
  });

  it("notes a file with a great many nodes", () => {
    expect(largeDocumentNote(rows(LARGE_DOCUMENT.NODES))).toMatch(/2,001 nodes.*may be slow/);
  });

  it("notes a file that is simply big", () => {
    const big = JSON.stringify({ s: "x".repeat(LARGE_DOCUMENT.SIZE_KB * 1024 + 10) });
    expect(largeDocumentNote(big)).toMatch(/1\.0 MB.*may be slow/);
  });

  it("says nothing about invalid JSON", () => {
    expect(largeDocumentNote("{nope")).toBeNull();
  });
});
