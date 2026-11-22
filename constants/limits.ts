import { buildGraph } from "../app/editor/components/Visualizers/graph/buildGraph";

/**
 * There are no plan limits: every feature is free. Very large documents can
 * still be slow, because everything runs in the browser, so past these sizes
 * the editor says so once and carries on.
 */
export const LARGE_DOCUMENT = {
  NODES: 2000,
  SIZE_KB: 1024,
};

export const countJsonLines = (json: string): number => json.split("\n").length;

/** Number of nodes the graph draws for this value. */
export const countJsonNodes = (value: unknown): number =>
  buildGraph(value).nodes.length;

export const getJsonDepth = (value: any): number => {
  if (value === null || typeof value !== "object") return 0;
  let max = 0;
  for (const child of Object.values(value)) {
    max = Math.max(max, getJsonDepth(child));
  }
  return max + 1;
};

/**
 * A short note if the document is big enough to be slow, otherwise null.
 * Invalid JSON returns null: there's nothing to measure yet.
 */
export function largeDocumentNote(json: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  const sizeKb = new Blob([json]).size / 1024;
  const nodes = countJsonNodes(parsed);
  if (nodes <= LARGE_DOCUMENT.NODES && sizeKb <= LARGE_DOCUMENT.SIZE_KB) return null;
  const what =
    nodes > LARGE_DOCUMENT.NODES
      ? `${nodes.toLocaleString("en")} nodes`
      : `${(sizeKb / 1024).toFixed(1)} MB`;
  return `This is a large file (${what}), so things may be slow. The Tree view copes best.`;
}
