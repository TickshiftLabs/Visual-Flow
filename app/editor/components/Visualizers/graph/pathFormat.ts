import type { JsonPath } from "./buildGraph";

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/**
 * JSONPath for a path, e.g. `$.items[0].sku`. Keys that aren't plain
 * identifiers use bracket form: `$['odd key']`.
 */
export function toJsonPath(path: JsonPath): string {
  return path.reduce<string>((out, seg) => {
    if (typeof seg === "number") return `${out}[${seg}]`;
    if (IDENTIFIER.test(seg)) return `${out}.${seg}`;
    return `${out}['${seg.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}']`;
  }, "$");
}

/**
 * JavaScript accessor for a path, e.g. `data.items[0].sku`, ready to paste
 * into code. Uses optional chaining so it's safe on partial data.
 */
export function toJsAccessor(path: JsonPath, root = "data"): string {
  return path.reduce<string>((out, seg) => {
    if (typeof seg === "number") return `${out}?.[${seg}]`;
    if (IDENTIFIER.test(seg)) return `${out}?.${seg}`;
    return `${out}?.[${JSON.stringify(seg)}]`;
  }, root);
}

/** Name shown for the value at a path: its last key or index, or "root". */
export function pathLabel(path: JsonPath): string {
  if (path.length === 0) return "root";
  const last = path[path.length - 1];
  if (typeof last === "number") {
    const parent = path[path.length - 2];
    return typeof parent === "string" ? `${parent}[${last}]` : `[${last}]`;
  }
  return last;
}
