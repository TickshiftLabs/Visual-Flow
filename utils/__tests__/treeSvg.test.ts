import { buildRows } from "../../app/editor/components/Visualizers/tree/buildRows";
import { renderTreeSvg } from "../treeSvg";

const options = { fontFamily: "monospace" };
const doc = { name: "Aurora", crew: [{ name: "Ada" }], tags: ["a"], none: null };
const rowsOf = (closed: string[] = [], query = "") =>
  buildRows(doc, { closed: new Set(closed), query });
const count = (text: string, needle: string) => text.split(needle).length - 1;

describe("renderTreeSvg", () => {
  it("draws one line per row, with keys and values as text", () => {
    const rows = rowsOf();
    const { svg, height } = renderTreeSvg(rows, { ...options, padding: 10 });
    expect(height).toBe(rows.length * 27 + 20);
    for (const text of ["root", "name", "&quot;Aurora&quot;", "crew", "[1]", "null"]) {
      expect(svg).toContain(`>${text}</text>`);
    }
    // One label per row, plus one value/count per row.
    expect(count(svg, "<text")).toBe(rows.length * 2);
  });

  it("draws only what's unfolded", () => {
    const { svg } = renderTreeSvg(rowsOf(['$."crew"']), options);
    expect(svg).toContain(">crew</text>");
    expect(svg).not.toContain("&quot;Ada&quot;");
  });

  it("follows the search filter", () => {
    const { svg } = renderTreeSvg(rowsOf([], "ada"), options);
    expect(svg).toContain("&quot;Ada&quot;");
    expect(svg).not.toContain("&quot;Aurora&quot;");
  });

  it("is a tree, not node cards", () => {
    const { svg } = renderTreeSvg(rowsOf(), options);
    expect(svg).not.toContain('rx="9"');
    expect(svg).not.toContain("stroke-width");
  });

  it("produces valid XML for awkward text", () => {
    const rows = buildRows({ "<k&>": 'a "<b>" & c' }, { closed: new Set() });
    const { svg } = renderTreeSvg(rows, options);
    const parsed = new DOMParser().parseFromString(svg, "image/svg+xml");
    expect(parsed.querySelector("parsererror")).toBeNull();
  });

  it("handles no rows", () => {
    const out = renderTreeSvg([], options);
    expect(out.height).toBeGreaterThan(0);
    expect(out.svg.startsWith("<svg")).toBe(true);
  });
});
