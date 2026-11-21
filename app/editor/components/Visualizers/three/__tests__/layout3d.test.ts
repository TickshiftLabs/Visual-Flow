import { buildGraph } from "../../graph/buildGraph";
import { coneLayout, constellationLayout, layout3d, type Vec3 } from "../layout3d";

const doc = {
  name: "Aurora",
  launch: { site: "Kourou", pad: { id: 3 } },
  crew: [{ name: "Ada" }, { name: "Kenji" }, { name: "Mae" }],
  payload: { orbit: { km: 620 }, tags: ["a", "b"] },
};
const graph = buildGraph(doc);
const index = (id: string) => graph.nodes.findIndex((n) => n.id === id);

const dist = (a: Vec3, b: Vec3) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

const allFinite = (points: Vec3[]) =>
  points.every((p) => p.every((v) => Number.isFinite(v)));

const minGap = (points: Vec3[]) => {
  let min = Infinity;
  for (let a = 0; a < points.length; a++) {
    for (let b = a + 1; b < points.length; b++) {
      min = Math.min(min, dist(points[a], points[b]));
    }
  }
  return min;
};

describe.each([
  ["cone", coneLayout],
  ["constellation", constellationLayout],
] as const)("%s layout", (_, layout) => {
  it("gives every node a finite position", () => {
    const points = layout(graph);
    expect(points).toHaveLength(graph.nodes.length);
    expect(allFinite(points)).toBe(true);
  });

  it("keeps nodes apart", () => {
    expect(minGap(layout(graph))).toBeGreaterThan(20);
  });

  it("is deterministic", () => {
    expect(layout(graph)).toEqual(layout(graph));
  });

  it("handles a single node and an empty graph", () => {
    expect(layout(buildGraph({ a: 1 }))).toHaveLength(1);
    expect(layout({ nodes: [], edges: [] })).toEqual([]);
  });

  it("stays finite on a wide, flat document", () => {
    const wide = buildGraph({
      rows: Array.from({ length: 200 }, (_, i) => ({ id: i })),
    });
    const points = layout(wide);
    expect(points).toHaveLength(201);
    expect(allFinite(points)).toBe(true);
  });
});

describe("coneLayout", () => {
  const points = coneLayout(graph);

  it("puts every child one level below its parent", () => {
    for (const edge of graph.edges) {
      const parent = points[index(edge.source)];
      const child = points[index(edge.target)];
      expect(parent[1] - child[1]).toBeCloseTo(110);
    }
  });

  it("puts siblings on a ring around their parent", () => {
    const root = points[0];
    const kids = graph.edges
      .filter((e) => e.source === "$")
      .map((e) => points[index(e.target)]);
    expect(kids.length).toBeGreaterThan(2);
    const radii = kids.map((k) => Math.hypot(k[0] - root[0], k[2] - root[2]));
    for (const r of radii) expect(r).toBeCloseTo(radii[0]);
    expect(radii[0]).toBeGreaterThan(0);
  });

  it("puts an only child straight below its parent", () => {
    const parent = points[index('$."launch"')];
    const child = points[index('$."launch"."pad"')];
    expect(child[0]).toBeCloseTo(parent[0]);
    expect(child[2]).toBeCloseTo(parent[2]);
  });
});

describe("constellationLayout", () => {
  it("keeps linked nodes closer than the graph is wide", () => {
    const points = constellationLayout(graph);
    const linked =
      graph.edges.reduce(
        (sum, e) => sum + dist(points[index(e.source)], points[index(e.target)]),
        0
      ) / graph.edges.length;
    let widest = 0;
    for (const a of points) for (const b of points) widest = Math.max(widest, dist(a, b));
    expect(linked).toBeLessThan(widest * 0.6);
    expect(linked).toBeGreaterThan(40);
  });
});

describe("layout3d", () => {
  it("dispatches on the layout name", () => {
    expect(layout3d(graph, "cone")).toEqual(coneLayout(graph));
    expect(layout3d(graph, "constellation")).toEqual(constellationLayout(graph));
  });
});
