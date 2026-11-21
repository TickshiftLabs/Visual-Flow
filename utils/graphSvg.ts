import { getBezierPath, getSmoothStepPath, Position } from "@xyflow/react";
import type {
  GraphNode,
  NodeKind,
  ValueKind,
} from "@/app/editor/components/Visualizers/graph/buildGraph";
import {
  HEADER_HEIGHT,
  NODE_WIDTH,
  ROW_HEIGHT,
  nodeHeight,
} from "@/app/editor/components/Visualizers/graph/graphLayout";

/**
 * Draws the graph as a real SVG document, straight from the graph data.
 * Used for image export: it's fast, the files are small, text stays text,
 * and it doesn't depend on what happens to be on screen.
 */

export interface SvgNode {
  node: GraphNode;
  /** Top-left corner. */
  x: number;
  y: number;
  /** Row indexes whose children are folded away (drawn with `+`). */
  collapsedRows?: ReadonlySet<number>;
}

export interface SvgEdge {
  source: string;
  target: string;
  sourceRow: number;
}

export interface GraphSvgOptions {
  direction: "LR" | "TB";
  /** "smoothstep" for stepped lines; anything else is curved. */
  edgeType: string;
  showGrid: boolean;
  /** CSS font-family for all text. */
  fontFamily: string;
  /** Optional @font-face rules to embed so the file renders the same anywhere. */
  fontCss?: string;
  padding?: number;
}

export interface GraphSvg {
  svg: string;
  width: number;
  height: number;
}

const COLORS = {
  background: "#0e1012",
  grid: "rgba(255,255,255,0.09)",
  panel: "#131518",
  border: "#26292e",
  rule: "#1c1f23",
  rowRule: "rgba(255,255,255,0.03)",
  text: "#ecedee",
  dim: "#8b919a",
  faint: "#555b64",
  edge: "#343940",
};

const KIND_COLOR: Record<NodeKind, string> = {
  root: "#c8f169",
  object: "#8ab4ff",
  array: "#f5b56b",
  item: "#f5b56b",
  value: "#7fd6a4",
};

const VALUE_COLOR: Record<ValueKind, string> = {
  string: "#e6c08a",
  number: "#8ab4ff",
  boolean: "#f29a9a",
  null: "#8b919a",
  object: "#555b64",
  array: "#555b64",
};

const FONT_SIZE = 12;
/** The node font is monospaced: every character is 0.6em wide. */
const CHAR_WIDTH = FONT_SIZE * 0.6;
const PAD_X = 10;
const INNER = NODE_WIDTH - PAD_X * 2;

const escapeXml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    // Control characters are not allowed in XML 1.0.
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "�");

/** Cuts text to fit a pixel width, the way the on-screen cards do with an ellipsis. */
export function fit(text: string, maxWidth: number, charWidth = CHAR_WIDTH): string {
  const chars = Array.from(text);
  const max = Math.max(1, Math.floor(maxWidth / charWidth));
  return chars.length <= max ? text : chars.slice(0, max - 1).join("") + "…";
}

const n = (value: number) => Number(value.toFixed(2));

function nodeSvg({ node, x, y, collapsedRows }: SvgNode, vertical: boolean): string {
  const height = nodeHeight(node);
  const out: string[] = [];
  out.push(
    `<rect x="${n(x + 0.5)}" y="${n(y + 0.5)}" width="${NODE_WIDTH - 1}" height="${height - 1}" rx="9" fill="${COLORS.panel}" stroke="${COLORS.border}"/>`,
    `<path d="M${n(x + 1)} ${n(y + HEADER_HEIGHT + 0.5)}h${NODE_WIDTH - 2}" stroke="${COLORS.rule}"/>`,
    `<rect x="${n(x + PAD_X)}" y="${n(y + HEADER_HEIGHT / 2 - 3.5)}" width="8" height="8" rx="2" fill="${KIND_COLOR[node.kind]}"/>`
  );

  const count =
    node.shape === "array"
      ? `[${node.rows.length}]`
      : node.shape === "object"
      ? `{${node.rows.length}}`
      : "";
  const countWidth = count.length * 11 * 0.6;
  const labelX = x + PAD_X + 16;
  const label = fit(node.label, INNER - 16 - countWidth - (count ? 10 : 0));
  const headerY = y + HEADER_HEIGHT / 2 + 4.5;
  out.push(`<text x="${n(labelX)}" y="${n(headerY)}" fill="${COLORS.text}">${escapeXml(label)}</text>`);
  if (count) {
    out.push(
      `<text x="${n(x + NODE_WIDTH - PAD_X)}" y="${n(headerY)}" fill="${COLORS.faint}" font-size="11" text-anchor="end">${escapeXml(count)}</text>`
    );
  }

  node.rows.forEach((row, i) => {
    const top = y + 1 + HEADER_HEIGHT + i * ROW_HEIGHT;
    const baseline = top + ROW_HEIGHT / 2 + 4.5;
    if (i > 0) {
      out.push(`<path d="M${n(x + 1)} ${n(top + 0.5)}h${NODE_WIDTH - 2}" stroke="${COLORS.rowRule}"/>`);
    }
    const key = fit(row.key, INNER / 2);
    const keyWidth = Array.from(key).length * CHAR_WIDTH;
    const hasChildren = row.children.length > 0;
    const marker = hasChildren ? (collapsedRows?.has(i) ? "+" : vertical ? "↓" : "→") : "";
    const markerWidth = marker ? CHAR_WIDTH + 6 : 0;
    const value = fit(row.display, INNER - keyWidth - 12 - markerWidth);

    out.push(`<text x="${n(x + PAD_X)}" y="${n(baseline)}" fill="${COLORS.dim}">${escapeXml(key)}</text>`);
    out.push(
      `<text x="${n(x + NODE_WIDTH - PAD_X - markerWidth)}" y="${n(baseline)}" fill="${VALUE_COLOR[row.kind]}" text-anchor="end">${escapeXml(value)}</text>`
    );
    if (marker) {
      out.push(
        `<text x="${n(x + NODE_WIDTH - PAD_X)}" y="${n(baseline)}" fill="${COLORS.dim}" text-anchor="end">${marker}</text>`
      );
    }
  });

  return out.join("");
}

export function renderGraphSvg(
  nodes: SvgNode[],
  edges: SvgEdge[],
  options: GraphSvgOptions
): GraphSvg {
  const padding = options.padding ?? 48;
  const vertical = options.direction === "TB";

  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const item of nodes) {
    left = Math.min(left, item.x);
    top = Math.min(top, item.y);
    right = Math.max(right, item.x + NODE_WIDTH);
    bottom = Math.max(bottom, item.y + nodeHeight(item.node));
  }
  if (!nodes.length) left = top = right = bottom = 0;

  const width = Math.ceil(right - left + padding * 2);
  const height = Math.ceil(bottom - top + padding * 2);
  const byId = new Map(nodes.map((item) => [item.node.id, item]));

  const paths: string[] = [];
  for (const edge of edges) {
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target) continue; // one end is folded away
    const from = vertical
      ? { x: source.x + NODE_WIDTH / 2, y: source.y + nodeHeight(source.node) }
      : {
          x: source.x + NODE_WIDTH,
          y: source.y + 1 + HEADER_HEIGHT + edge.sourceRow * ROW_HEIGHT + ROW_HEIGHT / 2,
        };
    const to = vertical
      ? { x: target.x + NODE_WIDTH / 2, y: target.y }
      : { x: target.x, y: target.y + HEADER_HEIGHT / 2 };
    const params = {
      sourceX: from.x,
      sourceY: from.y,
      sourcePosition: vertical ? Position.Bottom : Position.Right,
      targetX: to.x,
      targetY: to.y,
      targetPosition: vertical ? Position.Top : Position.Left,
    };
    const [d] =
      options.edgeType === "smoothstep"
        ? getSmoothStepPath(params)
        : getBezierPath(params);
    paths.push(`<path d="${d}"/>`);
  }

  const fontCss = options.fontCss ? `<style>${options.fontCss}</style>` : "";
  const grid = options.showGrid
    ? `<defs><pattern id="g" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.6" fill="${COLORS.grid}"/></pattern></defs><rect width="${width}" height="${height}" fill="url(#g)"/>`
    : "";

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    fontCss +
    `<rect width="${width}" height="${height}" fill="${COLORS.background}"/>` +
    grid +
    `<g transform="translate(${n(padding - left)} ${n(padding - top)})">` +
    `<g fill="none" stroke="${COLORS.edge}" stroke-width="1.5">${paths.join("")}</g>` +
    `<g font-family="${escapeXml(options.fontFamily)}" font-size="${FONT_SIZE}">${nodes
      .map((item) => nodeSvg(item, vertical))
      .join("")}</g>` +
    `</g></svg>`;

  return { svg, width, height };
}
