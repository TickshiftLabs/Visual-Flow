import { ancestorIds, branchesFrom, buildRows, countAllRows } from "../buildRows";

const doc = {
  name: "Aurora",
  launch: { site: "Kourou", go: true },
  crew: [{ name: "Ada" }, { name: "Kenji" }],
  tags: ["a", "b"],
  empty: {},
  none: null,
};

const none = new Set<string>();
const labels = (rows: ReturnType<typeof buildRows>) =>
  rows.map((r) => `${"  ".repeat(r.depth)}${r.label}`);

describe("buildRows", () => {
  it("lists every key in document order when nothing is folded", () => {
    expect(labels(buildRows(doc, { closed: none }))).toEqual([
      "root",
      "  name",
      "  launch",
      "    site",
      "    go",
      "  crew",
      "    0",
      "      name",
      "    1",
      "      name",
      "  tags",
      "    0",
      "    1",
      "  empty",
      "  none",
    ]);
  });

  it("marks branches and gives counts or values as text", () => {
    const rows = buildRows(doc, { closed: none });
    const by = (label: string) => rows.find((r) => r.label === label)!;
    expect(by("root")).toMatchObject({ isBranch: true, text: "{6}", id: "$" });
    expect(by("crew")).toMatchObject({ isBranch: true, text: "[2]", kind: "array" });
    expect(by("site")).toMatchObject({ isBranch: false, text: '"Kourou"', kind: "string" });
    expect(by("go")).toMatchObject({ text: "true", kind: "boolean" });
    expect(by("empty")).toMatchObject({ isBranch: false, text: "{}" });
    expect(by("none")).toMatchObject({ isBranch: false, text: "null", kind: "null" });
  });

  it("gives each row the path to its value", () => {
    const rows = buildRows(doc, { closed: none });
    expect(rows.find((r) => r.id === '$."crew"[1]."name"')!.path).toEqual([
      "crew",
      1,
      "name",
    ]);
  });

  it("skips the children of folded branches", () => {
    const rows = buildRows(doc, { closed: new Set(['$."crew"', '$."launch"']) });
    expect(labels(rows)).toEqual([
      "root",
      "  name",
      "  launch",
      "  crew",
      "  tags",
      "    0",
      "    1",
      "  empty",
      "  none",
    ]);
    expect(rows.find((r) => r.label === "crew")!.isOpen).toBe(false);
  });

  it("when searching, keeps matches and their ancestors only", () => {
    const rows = buildRows(doc, { closed: none, query: "kenji" });
    expect(labels(rows)).toEqual(["root", "  crew", "    1", "      name"]);
    expect(rows.filter((r) => r.isMatch).map((r) => r.id)).toEqual([
      '$."crew"[1]."name"',
    ]);
  });

  it("search opens folded branches so matches are visible", () => {
    const rows = buildRows(doc, { closed: new Set(["$", '$."crew"']), query: "ada" });
    expect(labels(rows)).toEqual(["root", "  crew", "    0", "      name"]);
  });

  it("search matches keys as well as values, ignoring case", () => {
    const rows = buildRows(doc, { closed: none, query: "SITE" });
    expect(rows.filter((r) => r.isMatch).map((r) => r.label)).toEqual(["site"]);
  });

  it("a matching branch stays, with its children", () => {
    const rows = buildRows(doc, { closed: none, query: "launch" });
    expect(labels(rows)).toEqual(["root", "  launch", "    site", "    go"]);
  });

  it("returns nothing when a search has no matches", () => {
    expect(buildRows(doc, { closed: none, query: "zzz" })).toEqual([]);
  });

  it("handles primitive and array roots", () => {
    expect(labels(buildRows(42, { closed: none }))).toEqual(["root"]);
    expect(labels(buildRows([1, [2]], { closed: none }))).toEqual([
      "root",
      "  0",
      "  1",
      "    0",
    ]);
  });
});

describe("helpers", () => {
  it("countAllRows counts every row of the fully open tree", () => {
    expect(countAllRows(doc)).toBe(buildRows(doc, { closed: none }).length);
    expect(countAllRows(1)).toBe(1);
  });

  it("branchesFrom lists branches at or below a depth", () => {
    expect([...branchesFrom(doc, 1)].sort()).toEqual(
      ['$."crew"', '$."crew"[0]', '$."crew"[1]', '$."launch"', '$."tags"'].sort()
    );
    expect([...branchesFrom(doc, 2)].sort()).toEqual(
      ['$."crew"[0]', '$."crew"[1]'].sort()
    );
  });

  it("ancestorIds lists parents from the root down", () => {
    expect(ancestorIds(["crew", 1, "name"])).toEqual(["$", '$."crew"', '$."crew"[1]']);
    expect(ancestorIds([])).toEqual([]);
  });
});
