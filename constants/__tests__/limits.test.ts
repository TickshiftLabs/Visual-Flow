import {
  FREE_LIMITS,
  countJsonNodes,
  getJsonDepth,
  validateJsonAgainstFreeLimits,
} from "../limits";
import { buildGraph } from "../../app/editor/components/Visualizers/graph/buildGraph";

describe("countJsonNodes", () => {
  it("matches the number of nodes the graph actually draws", () => {
    const docs: unknown[] = [
      { a: 1 },
      { a: { b: { c: 1 } } },
      { items: [{ x: 1 }, { x: 2 }], tags: ["a", "b"] },
      { grid: [[1, 2], [3, [4, 5]]] },
      { mix: [1, { a: 1 }, [2]] },
      [{ a: 1 }, 2, [3]],
      { a: {}, b: [], c: { d: {} } },
      "hello",
      [],
    ];
    for (const doc of docs) {
      expect([JSON.stringify(doc), countJsonNodes(doc)]).toEqual([
        JSON.stringify(doc),
        buildGraph(doc).nodes.length,
      ]);
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

describe("validateJsonAgainstFreeLimits", () => {
  const manyNodes = (n: number) =>
    JSON.stringify({ rows: Array.from({ length: n }, (_, i) => ({ id: i })) });

  it("accepts a small document", () => {
    expect(validateJsonAgainstFreeLimits('{"a":1}').isValid).toBe(true);
  });

  it("accepts a document exactly at the node limit", () => {
    expect(
      validateJsonAgainstFreeLimits(manyNodes(FREE_LIMITS.MAX_NODES - 1)).isValid
    ).toBe(true);
  });

  it("rejects a document over the node limit", () => {
    const result = validateJsonAgainstFreeLimits(manyNodes(FREE_LIMITS.MAX_NODES));
    expect(result.isValid).toBe(false);
    expect(result.message).toMatch(/Node count \(201\)/);
  });

  it("rejects a document over the size limit", () => {
    const big = JSON.stringify({ s: "x".repeat(FREE_LIMITS.MAX_SIZE_KB * 1024) });
    const result = validateJsonAgainstFreeLimits(big);
    expect(result.isValid).toBe(false);
    expect(result.message).toMatch(/File size/);
  });

  it("flags invalid JSON as a format error, not a limit", () => {
    expect(validateJsonAgainstFreeLimits("{nope")).toMatchObject({
      isValid: false,
      isFormatError: true,
    });
  });

  it("lets Pro users through regardless of size", () => {
    expect(
      validateJsonAgainstFreeLimits(manyNodes(5000), true).isValid
    ).toBe(true);
  });
});
