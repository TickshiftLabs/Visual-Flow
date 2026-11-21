import {
  displayValue,
  kindOf,
  pathToId,
  type JsonPath,
  type ValueKind,
} from "../graph/buildGraph";

/** One line of the outline tree. */
export interface TreeRow {
  id: string;
  path: JsonPath;
  depth: number;
  /** Key or array index shown on the left; "root" for the top row. */
  label: string;
  kind: ValueKind;
  /** True for non-empty objects and arrays, which can be folded. */
  isBranch: boolean;
  isOpen: boolean;
  /** Value text for leaves; child count (`{3}`, `[2]`) for branches. */
  text: string;
  /** Set when a search is active and this row's key or value matches. */
  isMatch: boolean;
}

export interface BuildRowsOptions {
  /** Ids of branches the user has folded. */
  closed: ReadonlySet<string>;
  /** Lower-cased search text; empty for no search. */
  query?: string;
}

const isBranchValue = (v: unknown): v is object =>
  v !== null &&
  typeof v === "object" &&
  (Array.isArray(v) ? v.length > 0 : Object.keys(v).length > 0);

const countText = (v: object) =>
  Array.isArray(v) ? `[${v.length}]` : `{${Object.keys(v).length}}`;

/**
 * Flattens a JSON value into the rows currently visible in the outline tree.
 *
 * Without a search, children of folded branches are skipped. With a search,
 * only matching rows, their ancestors, and everything inside a matching
 * branch are kept; branches are shown open regardless of fold state so every
 * match is visible.
 */
export function buildRows(root: unknown, options: BuildRowsOptions): TreeRow[] {
  const { closed } = options;
  const query = options.query?.trim().toLowerCase() ?? "";
  const searching = query !== "";
  const rows: TreeRow[] = [];

  /** Appends the row for `value` (and its visible children); returns whether the subtree has a match. */
  function visit(
    value: unknown,
    path: JsonPath,
    label: string,
    depth: number,
    insideMatch: boolean
  ): boolean {
    const id = pathToId(path);
    const branch = isBranchValue(value);
    const text = branch ? countText(value) : displayValue(value);
    const isMatch =
      searching &&
      (label.toLowerCase().includes(query) ||
        (!branch && text.toLowerCase().includes(query)));

    const row: TreeRow = {
      id,
      path,
      depth,
      label,
      kind: kindOf(value),
      isBranch: branch,
      isOpen: branch && (searching || !closed.has(id)),
      text,
      isMatch,
    };
    const index = rows.length;
    rows.push(row);

    let childMatch = false;
    if (branch && row.isOpen) {
      const entries: Array<[string | number, unknown]> = Array.isArray(value)
        ? value.map((item, i) => [i, item])
        : Object.entries(value);
      for (const [key, child] of entries) {
        if (
          visit(child, [...path, key], String(key), depth + 1, insideMatch || isMatch)
        ) {
          childMatch = true;
        }
      }
    }

    if (searching && !isMatch && !childMatch && !insideMatch) {
      rows.length = index; // drop this row and anything under it
      return false;
    }
    return isMatch || childMatch;
  }

  visit(root, [], "root", 0, false);
  return rows;
}

/** Total rows if every branch were open; used to decide the default fold depth. */
export function countAllRows(value: unknown): number {
  if (!isBranchValue(value)) return 1;
  let total = 1;
  for (const child of Object.values(value)) total += countAllRows(child);
  return total;
}

/**
 * Ids of branches at `depth` or deeper. Big documents start folded past the
 * first couple of levels so the list isn't thousands of rows long on open.
 */
export function branchesFrom(root: unknown, depth: number): Set<string> {
  const out = new Set<string>();
  const walk = (value: unknown, path: JsonPath, level: number) => {
    if (!isBranchValue(value)) return;
    if (level >= depth) out.add(pathToId(path));
    const entries: Array<[string | number, unknown]> = Array.isArray(value)
      ? value.map((item, i) => [i, item])
      : Object.entries(value);
    for (const [key, child] of entries) walk(child, [...path, key], level + 1);
  };
  walk(root, [], 0);
  return out;
}

/** Ids of every ancestor of `path`, root first (not including `path` itself). */
export function ancestorIds(path: JsonPath): string[] {
  return path.map((_, i) => pathToId(path.slice(0, i)));
}
