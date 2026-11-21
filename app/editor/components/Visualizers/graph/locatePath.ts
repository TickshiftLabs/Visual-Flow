import type { JsonPath } from "./buildGraph";

export interface TextRange {
  /** Offset of the first character (the key, for object members). */
  start: number;
  /** Offset just past the last character of the value. */
  end: number;
}

const isSpace = (c: string) => c === " " || c === "\n" || c === "\t" || c === "\r";

/**
 * Finds where the value at `path` sits in JSON source text, without building
 * a full syntax tree. For an object member the range starts at its key, so
 * `"user": { ... }` is covered as a whole. Returns null if the path isn't
 * there or the text is too malformed to follow.
 */
export function locatePath(text: string, path: JsonPath): TextRange | null {
  const skipSpace = (i: number) => {
    while (i < text.length && isSpace(text[i])) i++;
    return i;
  };

  /** Index just past the string starting at `i` (which must be a quote). */
  const skipString = (i: number) => {
    i++;
    while (i < text.length && text[i] !== '"') i += text[i] === "\\" ? 2 : 1;
    return i + 1;
  };

  /** Index just past the value starting at `i`. */
  const skipValue = (i: number): number => {
    const c = text[i];
    if (c === '"') return skipString(i);
    if (c === "{" || c === "[") {
      let depth = 0;
      while (i < text.length) {
        const ch = text[i];
        if (ch === '"') {
          i = skipString(i);
          continue;
        }
        if (ch === "{" || ch === "[") depth++;
        else if (ch === "}" || ch === "]") {
          depth--;
          if (depth === 0) return i + 1;
        }
        i++;
      }
      return i;
    }
    while (i < text.length && !isSpace(text[i]) && !",]}".includes(text[i])) i++;
    return i;
  };

  /** `i` is the start of a value; follow `path` from segment `depth`. */
  const find = (i: number, depth: number): TextRange | null => {
    if (depth === path.length) return { start: i, end: skipValue(i) };
    if (i >= text.length) return null;

    const segment = path[depth];
    const open = text[i];
    const isLast = depth === path.length - 1;

    if (open === "{" && typeof segment === "string") {
      let found: TextRange | null = null;
      i = skipSpace(i + 1);
      while (i < text.length && text[i] === '"') {
        const keyStart = i;
        const keyEnd = skipString(i);
        let key: string;
        try {
          key = JSON.parse(text.slice(keyStart, keyEnd));
        } catch {
          return null;
        }
        i = skipSpace(keyEnd);
        if (text[i] !== ":") return null;
        const valueStart = skipSpace(i + 1);
        if (key === segment) {
          // Keep going: with duplicate keys, JSON.parse keeps the last one.
          const inner = find(valueStart, depth + 1);
          found = inner && isLast ? { start: keyStart, end: inner.end } : inner;
        }
        i = skipSpace(skipValue(valueStart));
        if (text[i] !== ",") break;
        i = skipSpace(i + 1);
      }
      return found;
    }

    if (open === "[" && typeof segment === "number") {
      i = skipSpace(i + 1);
      for (let index = 0; i < text.length && text[i] !== "]"; index++) {
        if (index === segment) return find(i, depth + 1);
        i = skipSpace(skipValue(i));
        if (text[i] !== ",") break;
        i = skipSpace(i + 1);
      }
    }

    return null;
  };

  return find(skipSpace(0), 0);
}
