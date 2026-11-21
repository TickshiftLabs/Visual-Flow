import { buildGraph } from "../../app/editor/components/Visualizers/graph/buildGraph";
import { layoutGraph } from "../../app/editor/components/Visualizers/graph/graphLayout";
import { fit, renderGraphSvg, type SvgNode } from "../graphSvg";

const options = {
  direction: "LR" as const,
  edgeType: "default",
  showGrid: false,
  fontFamily: "monospace",
};

function scene(doc: unknown, direction: "LR" | "TB" = "LR") {
  const graph = buildGraph(doc);
  const positions = layoutGraph(graph, direction);
  const nodes: SvgNode[] = graph.nodes.map((node) => ({ node, ...positions.get(node.id)! }));
  return { graph, nodes };
}

const count = (text: string, needle: string) => text.split(needle).length - 1;

describe("fit", () => {
  it("leaves short text alone and cuts long text with an ellipsis", () => {
    expect(fit("abc", 100, 10)).toBe("abc");
    expect(fit("abcdefghijkl", 50, 10)).toBe("abcd…");
    expect(Array.from(fit("abcdefghijkl", 50, 10))).toHaveLength(5);
  });

  it("counts emoji as one character", () => {
    expect(fit("🙂🙂🙂🙂🙂🙂", 30, 10)).toBe("🙂🙂…");
  });
});

describe("renderGraphSvg", () => {
  const doc = { id: 1, user: { name: "Ada" }, items: [{ sku: "A" }, { sku: "B" }] };

  it("draws one card per node and one line per link", () => {
    const { graph, nodes } = scene(doc);
    const { svg } = renderGraphSvg(nodes, graph.edges, options);
    expect(count(svg, 'rx="9"')).toBe(graph.nodes.length);
    expect(count(svg, '<path d="M')).toBeGreaterThanOrEqual(graph.edges.length);
    const edgeGroup = svg.slice(svg.indexOf('stroke-width="1.5"'), svg.indexOf("font-family"));
    expect(count(edgeGroup, "<path")).toBe(graph.edges.length);
  });

  it("includes labels, keys and values as real text", () => {
    const { graph, nodes } = scene(doc);
    const { svg } = renderGraphSvg(nodes, graph.edges, options);
    for (const text of ["root", "user", "items[0]", "name", "&quot;Ada&quot;", "sku", "{3}"]) {
      expect(svg).toContain(`>${text}</text>`);
    }
  });

  it("sizes the image to the graph plus padding", () => {
    const { graph, nodes } = scene({ a: 1 });
    const out = renderGraphSvg(nodes, graph.edges, { ...options, padding: 10 });
    expect(out.width).toBe(240 + 20);
    expect(out.height).toBe(30 + 24 + 2 + 20);
    expect(out.svg).toContain(`viewBox="0 0 ${out.width} ${out.height}"`);
  });

  it("escapes text so the file is always valid XML", () => {
    const { graph, nodes } = scene({ "<k&>": 'a "<b>" & c', ctrl: "x\u0001y" });
    const { svg } = renderGraphSvg(nodes, graph.edges, options);
    expect(svg).toContain("&lt;k&amp;&gt;");
    expect(svg).not.toMatch(/<b>/);
    expect(svg).not.toContain("\u0001");
    const doc2 = new DOMParser().parseFromString(svg, "image/svg+xml");
    expect(doc2.querySelector("parsererror")).toBeNull();
  });

  it("shortens values that don't fit in a card", () => {
    const { graph, nodes } = scene({ long: "x".repeat(500) });
    const { svg } = renderGraphSvg(nodes, graph.edges, options);
    expect(svg).not.toContain("x".repeat(40));
    expect(svg).toContain("…</text>");
  });

  it("leaves out links to nodes that aren't drawn (folded branches)", () => {
    const { graph, nodes } = scene(doc);
    const visible = nodes.filter((n) => !n.node.id.includes("items"));
    const { svg } = renderGraphSvg(visible, graph.edges, options);
    const edgeGroup = svg.slice(svg.indexOf('stroke-width="1.5"'), svg.indexOf("font-family"));
    expect(count(edgeGroup, "<path")).toBe(1);
    expect(svg).not.toContain("items[0]");
  });

  it("marks folded rows with a plus, open rows with an arrow", () => {
    const { graph, nodes } = scene(doc);
    nodes[0].collapsedRows = new Set([2]);
    const { svg } = renderGraphSvg(nodes, graph.edges, options);
    expect(svg).toContain(">+</text>");
    expect(svg).toContain(">→</text>");
  });

  it("uses down arrows and vertical links when top to bottom", () => {
    const { graph, nodes } = scene(doc, "TB");
    const { svg } = renderGraphSvg(nodes, graph.edges, { ...options, direction: "TB" });
    expect(svg).toContain(">↓</text>");
    expect(svg).not.toContain(">→</text>");
  });

  it("adds the dotted grid and embedded font only when asked", () => {
    const { graph, nodes } = scene(doc);
    const plain = renderGraphSvg(nodes, graph.edges, options).svg;
    expect(plain).not.toContain("<pattern");
    expect(plain).not.toContain("<style>");
    const rich = renderGraphSvg(nodes, graph.edges, {
      ...options,
      showGrid: true,
      fontCss: "@font-face{font-family:X}",
    }).svg;
    expect(rich).toContain("<pattern");
    expect(rich).toContain("<style>@font-face{font-family:X}</style>");
  });

  it("handles an empty graph", () => {
    const out = renderGraphSvg([], [], options);
    expect(out.width).toBeGreaterThan(0);
    expect(out.svg.startsWith("<svg")).toBe(true);
  });

  it("stays small: a 300-node graph is well under a megabyte", () => {
    const { graph, nodes } = scene({ rows: Array.from({ length: 300 }, (_, i) => ({ id: i, name: "row " + i })) });
    const { svg } = renderGraphSvg(nodes, graph.edges, options);
    expect(svg.length).toBeLessThan(400_000);
  });
});
