import { buildGraph, getAtPath, type JsonPath } from "../buildGraph";
import { locatePath } from "../locatePath";

const slice = (text: string, path: JsonPath) => {
  const range = locatePath(text, path);
  return range ? text.slice(range.start, range.end) : null;
};

describe("locatePath", () => {
  const doc = {
    id: 1,
    user: { name: "Ada", tags: ["a", "b"] },
    items: [{ sku: "A" }, { sku: "B", nested: { deep: [1, [2, 3]] } }],
  };
  const text = JSON.stringify(doc, null, 2);

  it("returns the whole document for the root", () => {
    expect(slice(text, [])).toBe(text);
  });

  it("includes the key for object members", () => {
    expect(slice(text, ["id"])).toBe('"id": 1');
    expect(slice(text, ["user", "name"])).toBe('"name": "Ada"');
    expect(slice(text, ["user"])!.startsWith('"user": {')).toBe(true);
    expect(slice(text, ["user"])!.endsWith("}")).toBe(true);
  });

  it("returns just the value for array items", () => {
    expect(JSON.parse(slice(text, ["items", 1])!)).toEqual(doc.items[1]);
    expect(slice(text, ["user", "tags", 1])).toBe('"b"');
    expect(slice(text, ["items", 1, "nested", "deep", 1, 0])).toBe("2");
  });

  it("works on minified text", () => {
    const min = JSON.stringify(doc);
    expect(slice(min, ["items", 0])).toBe('{"sku":"A"}');
    expect(slice(min, ["user", "tags"])).toBe('"tags":["a","b"]');
  });

  it("is not fooled by brackets, quotes and escapes inside strings", () => {
    const tricky = { a: 'x"}],{[', "k\"ey": { 'in"ner': [1] }, "a.b": 2, b: "\\" };
    const t = JSON.stringify(tricky, null, 2);
    expect(slice(t, ['k"ey', 'in"ner', 0])).toBe("1");
    expect(slice(t, ["a.b"])).toBe('"a.b": 2');
    expect(slice(t, ["b"])).toBe('"b": "\\\\"');
  });

  it("uses the last occurrence of a duplicated key, like JSON.parse", () => {
    const t = '{"a": {"v": 1}, "a": {"v": 2}}';
    expect(slice(t, ["a", "v"])).toBe('"v": 2');
  });

  it("tells a numeric-looking key from an array index", () => {
    expect(slice('{"0": "key"}', ["0"])).toBe('"0": "key"');
    expect(slice('{"0": "key"}', [0])).toBeNull();
    expect(slice('["item"]', ["0"])).toBeNull();
  });

  it("returns null for paths that don't exist or broken text", () => {
    expect(slice(text, ["nope"])).toBeNull();
    expect(slice(text, ["items", 9])).toBeNull();
    expect(slice(text, ["id", "x"])).toBeNull();
    expect(slice('{"a": {"b": ', ["a", "b", "c"])).toBeNull();
    expect(slice("", ["a"])).toBeNull();
  });

  it("finds every node of a graph at the right place", () => {
    const graph = buildGraph(doc);
    for (const node of graph.nodes) {
      const found = slice(text, node.path)!;
      // Strip a leading `"key": ` so only the value remains.
      const value = found.replace(/^"(?:[^"\\]|\\.)*":\s*(?=[\[{])/, "");
      expect(JSON.parse(value)).toEqual(getAtPath(doc, node.path));
    }
  });
});
