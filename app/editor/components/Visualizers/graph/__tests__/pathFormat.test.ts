import { pathLabel, toJsAccessor, toJsonPath } from "../pathFormat";

describe("toJsonPath", () => {
  it("formats keys and indexes", () => {
    expect(toJsonPath([])).toBe("$");
    expect(toJsonPath(["items", 0, "sku"])).toBe("$.items[0].sku");
    expect(toJsonPath([2, "a"])).toBe("$[2].a");
  });

  it("uses brackets for keys that aren't identifiers", () => {
    expect(toJsonPath(["odd key"])).toBe("$['odd key']");
    expect(toJsonPath(["a.b", "0"])).toBe("$['a.b']['0']");
    expect(toJsonPath([""])).toBe("$['']");
    expect(toJsonPath(["it's", "back\\slash"])).toBe("$['it\\'s']['back\\\\slash']");
  });
});

describe("toJsAccessor", () => {
  it("produces code that reads the value", () => {
    const data = { items: [{ "odd key": { $ok: 5 } }], "0": "zero", 'q"uote': 1 };
    const read = (path: (string | number)[]) =>
      new Function("data", `return ${toJsAccessor(path)}`)(data);
    expect(toJsAccessor(["items", 0, "odd key", "$ok"])).toBe(
      'data?.items?.[0]?.["odd key"]?.$ok'
    );
    expect(read(["items", 0, "odd key", "$ok"])).toBe(5);
    expect(read(["0"])).toBe("zero");
    expect(read(['q"uote'])).toBe(1);
    expect(read(["missing", 3, "x"])).toBeUndefined();
    expect(read([])).toBe(data);
  });

  it("accepts a different root name", () => {
    expect(toJsAccessor(["a"], "response")).toBe("response?.a");
  });
});

describe("pathLabel", () => {
  it("names the last step", () => {
    expect(pathLabel([])).toBe("root");
    expect(pathLabel(["user"])).toBe("user");
    expect(pathLabel(["items", 2])).toBe("items[2]");
    expect(pathLabel([0])).toBe("[0]");
    expect(pathLabel(["grid", 1, 0])).toBe("[0]");
  });
});
