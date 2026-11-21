import {
  buildGraph,
  descendantsOf,
  displayValue,
  getAtPath,
  pathToId,
} from "../buildGraph";

const byId = (g: ReturnType<typeof buildGraph>, id: string) =>
  g.nodes.find((n) => n.id === id)!;

describe("pathToId", () => {
  it("builds unique ids for keys and indices", () => {
    expect(pathToId([])).toBe("$");
    expect(pathToId(["user"])).toBe('$."user"');
    expect(pathToId(["items", 0])).toBe('$."items"[0]');
  });

  it("keeps a numeric-looking key distinct from an index", () => {
    expect(pathToId(["a", "0"])).not.toBe(pathToId(["a", 0]));
  });

  it("keeps keys containing dots distinct from nesting", () => {
    expect(pathToId(["a.b"])).not.toBe(pathToId(["a", "b"]));
  });
});

describe("displayValue", () => {
  it("formats each kind", () => {
    expect(displayValue("hi")).toBe('"hi"');
    expect(displayValue(4)).toBe("4");
    expect(displayValue(false)).toBe("false");
    expect(displayValue(null)).toBe("null");
    expect(displayValue({})).toBe("{}");
    expect(displayValue([])).toBe("[]");
    expect(displayValue({ a: 1 })).toBe("{1 key}");
    expect(displayValue([1, 2])).toBe("[2 items]");
  });
});

describe("buildGraph", () => {
  it("makes one root node for a flat object", () => {
    const g = buildGraph({ a: 1, b: "x", c: null });
    expect(g.nodes).toHaveLength(1);
    expect(g.edges).toHaveLength(0);
    expect(g.nodes[0]).toMatchObject({ id: "$", kind: "root", label: "root" });
    expect(g.nodes[0].rows.map((r) => [r.key, r.display, r.kind])).toEqual([
      ["a", "1", "number"],
      ["b", '"x"', "string"],
      ["c", "null", "null"],
    ]);
  });

  it("links a nested object from the row that holds it", () => {
    const g = buildGraph({ id: 1, user: { name: "Ada" } });
    expect(g.nodes.map((n) => n.id)).toEqual(["$", '$."user"']);
    expect(g.edges).toEqual([
      { id: '$->$."user"', source: "$", target: '$."user"', sourceRow: 1 },
    ]);
    expect(byId(g, "$").rows[1].children).toEqual(['$."user"']);
    expect(byId(g, '$."user"')).toMatchObject({
      label: "user",
      kind: "object",
      path: ["user"],
      parentId: "$",
    });
  });

  it("does not create nodes for empty containers", () => {
    const g = buildGraph({ a: {}, b: [] });
    expect(g.nodes).toHaveLength(1);
    expect(g.nodes[0].rows.map((r) => r.display)).toEqual(["{}", "[]"]);
  });

  it("puts an array of primitives in a single node", () => {
    const g = buildGraph({ tags: ["a", "b"] });
    expect(g.nodes).toHaveLength(2);
    const tags = byId(g, '$."tags"');
    expect(tags.kind).toBe("array");
    expect(tags.rows.map((r) => [r.key, r.display])).toEqual([
      ["0", '"a"'],
      ["1", '"b"'],
    ]);
  });

  it("hangs each item of an array of objects off the parent row", () => {
    const g = buildGraph({ items: [{ sku: "A" }, { sku: "B" }] });
    expect(g.nodes.map((n) => [n.id, n.label, n.kind])).toEqual([
      ["$", "root", "root"],
      ['$."items"[0]', "items[0]", "item"],
      ['$."items"[1]', "items[1]", "item"],
    ]);
    expect(byId(g, "$").rows[0].children).toHaveLength(2);
    expect(g.edges.every((e) => e.source === "$" && e.sourceRow === 0)).toBe(true);
  });

  it("gives primitives in a mixed array their own value node", () => {
    const g = buildGraph({ mix: [1, { a: 1 }] });
    expect(byId(g, '$."mix"[0]')).toMatchObject({ kind: "value" });
    expect(byId(g, '$."mix"[0]').rows[0].display).toBe("1");
    expect(byId(g, '$."mix"[1]')).toMatchObject({ kind: "item" });
  });

  it("handles nested arrays", () => {
    const g = buildGraph({ grid: [[1, 2], [3]] });
    expect(g.nodes.map((n) => n.label)).toEqual(["root", "grid[0]", "grid[1]"]);
    expect(byId(g, '$."grid"[0]').rows.map((r) => r.display)).toEqual(["1", "2"]);
  });

  it("handles a root array and a root primitive", () => {
    const arr = buildGraph([{ a: 1 }, 2]);
    expect(arr.nodes[0]).toMatchObject({ id: "$", kind: "root" });
    expect(arr.nodes[0].rows.map((r) => r.display)).toEqual(["{1 key}", "2"]);
    expect(arr.nodes.map((n) => n.id)).toEqual(["$", "$[0]"]);

    const prim = buildGraph("hello");
    expect(prim.nodes).toHaveLength(1);
    expect(prim.nodes[0].rows[0].display).toBe('"hello"');
  });

  it("keeps same-named keys at different depths as separate nodes", () => {
    const data = { a: { meta: { v: 1 } }, b: { meta: { v: 2 } } };
    const g = buildGraph(data);
    const metas = g.nodes.filter((n) => n.label === "meta");
    expect(metas).toHaveLength(2);
    expect(metas.map((n) => getAtPath(data, n.path))).toEqual([
      { v: 1 },
      { v: 2 },
    ]);
  });

  it("produces unique node and edge ids", () => {
    const g = buildGraph({
      a: [{ x: [{ y: 1 }] }, { x: [{ y: 2 }] }],
      "a.b": { c: 1 },
    });
    expect(new Set(g.nodes.map((n) => n.id)).size).toBe(g.nodes.length);
    expect(new Set(g.edges.map((e) => e.id)).size).toBe(g.edges.length);
  });
});

describe("getAtPath", () => {
  it("reads nested values and returns undefined for bad paths", () => {
    const data = { items: [{ sku: "A" }] };
    expect(getAtPath(data, [])).toBe(data);
    expect(getAtPath(data, ["items", 0, "sku"])).toBe("A");
    expect(getAtPath(data, ["nope", 0])).toBeUndefined();
  });
});

describe("descendantsOf", () => {
  it("returns everything below the given nodes", () => {
    const g = buildGraph({ a: { b: { c: { d: 1 } } }, z: { y: 1 } });
    expect([...descendantsOf(g, ['$."a"'])].sort()).toEqual(
      ['$."a"."b"', '$."a"."b"."c"'].sort()
    );
  });
});
