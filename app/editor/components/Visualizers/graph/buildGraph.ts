/**
 * Turns a parsed JSON value into a graph description: plain data, no layout
 * and no React. Every node carries the exact path to its value, so selection,
 * the inspector and search never have to guess from labels.
 *
 * Shape rules:
 * - Every non-empty object is a node; its keys are rows.
 * - An array made only of primitives is one node; its items are rows.
 * - An array containing objects/arrays has no node of its own: each item
 *   becomes a node linked straight from the parent row (label `items[0]`).
 * - The root value is always a node.
 */

export type JsonPath = Array<string | number>;

export type ValueKind =
  | "string"
  | "number"
  | "boolean"
  | "null"
  | "object"
  | "array";

export type NodeKind = "root" | "object" | "array" | "item" | "value";

export interface GraphRow {
  key: string;
  /** Text shown for the value, e.g. `"Ada"`, `42`, `{2 keys}`, `[3 items]`. */
  display: string;
  kind: ValueKind;
  /** Ids of the nodes this row links to (empty for primitives and empty containers). */
  children: string[];
}

export interface GraphNode {
  id: string;
  path: JsonPath;
  label: string;
  kind: NodeKind;
  /** Whether the value itself is an object, an array or a primitive. */
  shape: "object" | "array" | "value";
  rows: GraphRow[];
  parentId: string | null;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  /** Index of the row in the source node that this edge leaves from. */
  sourceRow: number;
}

export interface Graph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export const ROOT_ID = "$";

/** Stable, unique id for a path, e.g. `$`, `$.user`, `$.items[0]`. */
export function pathToId(path: JsonPath): string {
  return path.reduce<string>(
    (id, seg) =>
      typeof seg === "number" ? `${id}[${seg}]` : `${id}.${JSON.stringify(seg)}`,
    ROOT_ID
  );
}

export function kindOf(value: unknown): ValueKind {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  const t = typeof value;
  if (t === "object") return "object";
  if (t === "number" || t === "boolean") return t;
  return "string";
}

const isContainer = (v: unknown): v is object =>
  v !== null && typeof v === "object";

const isEmpty = (v: object) =>
  Array.isArray(v) ? v.length === 0 : Object.keys(v).length === 0;

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function displayValue(value: unknown): string {
  switch (kindOf(value)) {
    case "string":
      return JSON.stringify(value);
    case "array": {
      const n = (value as unknown[]).length;
      return n === 0 ? "[]" : `[${plural(n, "item")}]`;
    }
    case "object": {
      const n = Object.keys(value as object).length;
      return n === 0 ? "{}" : `{${plural(n, "key")}}`;
    }
    default:
      return String(value);
  }
}

export function buildGraph(root: unknown): Graph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  /** Registers a node and returns it so rows can be filled in afterwards. */
  function addNode(
    path: JsonPath,
    label: string,
    kind: NodeKind,
    shape: GraphNode["shape"],
    parentId: string | null
  ): GraphNode {
    const node: GraphNode = {
      id: pathToId(path),
      path,
      label,
      kind,
      shape,
      rows: [],
      parentId,
    };
    nodes.push(node);
    return node;
  }

  /** Adds one row to `node` for `value`, creating child nodes as needed. */
  function addRow(
    node: GraphNode,
    key: string | number,
    value: unknown,
    childLabel: string
  ) {
    const rowIndex = node.rows.length;
    const row: GraphRow = {
      key: String(key),
      display: displayValue(value),
      kind: kindOf(value),
      children: [],
    };
    node.rows.push(row);

    if (!isContainer(value) || isEmpty(value)) return;

    const childPath = [...node.path, key];
    const link = (id: string) => {
      row.children.push(id);
      edges.push({
        id: `${node.id}->${id}`,
        source: node.id,
        target: id,
        sourceRow: rowIndex,
      });
    };

    if (Array.isArray(value) && value.some(isContainer)) {
      // Mixed/complex array: each item hangs directly off this row.
      value.forEach((item, i) => {
        link(visit(item, [...childPath, i], `${childLabel}[${i}]`, "item", node.id));
      });
    } else {
      link(
        visit(
          value,
          childPath,
          childLabel,
          Array.isArray(value) ? "array" : "object",
          node.id
        )
      );
    }
  }

  /** Creates the node for `value` at `path` and returns its id. */
  function visit(
    value: unknown,
    path: JsonPath,
    label: string,
    kind: NodeKind,
    parentId: string | null
  ): string {
    if (Array.isArray(value)) {
      const node = addNode(path, label, kind, "array", parentId);
      value.forEach((item, i) => addRow(node, i, item, `${label}[${i}]`));
      return node.id;
    }

    if (isContainer(value)) {
      const node = addNode(path, label, kind, "object", parentId);
      for (const [key, child] of Object.entries(value)) {
        addRow(node, key, child, key);
      }
      return node.id;
    }

    // A primitive that needs its own node: the root, or an item in a mixed array.
    const node = addNode(
      path,
      label,
      kind === "root" ? "root" : "value",
      "value",
      parentId
    );
    node.rows.push({
      key: "value",
      display: displayValue(value),
      kind: kindOf(value),
      children: [],
    });
    return node.id;
  }

  visit(root, [], "root", "root", null);
  return { nodes, edges };
}

/** Reads the value at `path`, or `undefined` if the path doesn't exist. */
export function getAtPath(root: unknown, path: JsonPath): unknown {
  let current: any = root;
  for (const seg of path) {
    if (current === null || typeof current !== "object") return undefined;
    current = current[seg];
  }
  return current;
}

/** Ids of every node below the given ids (not including them). */
export function descendantsOf(graph: Graph, ids: Iterable<string>): Set<string> {
  const childrenOf = new Map<string, string[]>();
  for (const e of graph.edges) {
    const list = childrenOf.get(e.source);
    if (list) list.push(e.target);
    else childrenOf.set(e.source, [e.target]);
  }
  const out = new Set<string>();
  const stack = [...ids];
  while (stack.length) {
    for (const child of childrenOf.get(stack.pop()!) ?? []) {
      if (!out.has(child)) {
        out.add(child);
        stack.push(child);
      }
    }
  }
  return out;
}
