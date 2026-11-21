import type { ValueKind } from "@/app/editor/components/Visualizers/graph/buildGraph";
import type { TreeRow } from "@/app/editor/components/Visualizers/tree/buildRows";
import { fit, type GraphSvg } from "./graphSvg";

/** Draws the outline tree as an SVG document, one line per row, for image export. */

const ROW_HEIGHT = 27;
const INDENT = 18;
const WIDTH = 640;
const FONT_SIZE = 12.5;
const CHAR_WIDTH = FONT_SIZE * 0.6;

const VALUE_COLOR: Record<ValueKind, string> = {
  string: "#e6c08a",
  number: "#8ab4ff",
  boolean: "#f29a9a",
  null: "#8b919a",
  object: "#555b64",
  array: "#555b64",
};

const escapeXml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "�");

const n = (value: number) => Number(value.toFixed(2));

export interface TreeSvgOptions {
  fontFamily: string;
  fontCss?: string;
  padding?: number;
}

export function renderTreeSvg(rows: TreeRow[], options: TreeSvgOptions): GraphSvg {
  const padding = options.padding ?? 32;
  const width = WIDTH + padding * 2;
  const height = Math.max(rows.length, 1) * ROW_HEIGHT + padding * 2;
  const out: string[] = [];

  rows.forEach((row, i) => {
    const top = padding + i * ROW_HEIGHT;
    const baseline = top + ROW_HEIGHT / 2 + 4.5;
    const left = padding + 4 + row.depth * INDENT;

    // Indent guides, one per level.
    for (let level = 1; level <= row.depth; level++) {
      const x = padding + level * INDENT - 6.5;
      out.push(`<path d="M${n(x)} ${top}v${ROW_HEIGHT}" stroke="#1c1f23"/>`);
    }

    let x = left + 18;
    if (row.isBranch) {
      // Chevron: points right when folded, down when open.
      const cx = left + 9;
      const cy = top + ROW_HEIGHT / 2;
      out.push(
        row.isOpen
          ? `<path d="M${n(cx - 3.5)} ${n(cy - 2)}h7l-3.5 4.5z" fill="#555b64"/>`
          : `<path d="M${n(cx - 2)} ${n(cy - 3.5)}v7l4.5-3.5z" fill="#555b64"/>`
      );
      const color = row.depth === 0 ? "#c8f169" : row.kind === "array" ? "#f5b56b" : "#8ab4ff";
      out.push(
        `<rect x="${n(x + 8)}" y="${n(top + ROW_HEIGHT / 2 - 4)}" width="8" height="8" rx="2" fill="${color}"/>`
      );
      x += 24;
    }

    const right = padding + WIDTH - 10;
    const available = right - x;
    const label = fit(row.label, available * 0.45, CHAR_WIDTH);
    const labelWidth = Array.from(label).length * CHAR_WIDTH;
    out.push(
      `<text x="${n(x + 8)}" y="${n(baseline)}" fill="${row.isBranch ? "#ecedee" : "#8b919a"}">${escapeXml(label)}</text>`
    );

    if (row.isBranch) {
      out.push(
        `<text x="${n(right)}" y="${n(baseline)}" fill="#555b64" font-size="11.5" text-anchor="end">${escapeXml(row.text)}</text>`
      );
    } else {
      const value = fit(row.text, available - labelWidth - 28, CHAR_WIDTH);
      out.push(
        `<text x="${n(right)}" y="${n(baseline)}" fill="${VALUE_COLOR[row.kind]}" text-anchor="end">${escapeXml(value)}</text>`
      );
    }
  });

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    (options.fontCss ? `<style>${options.fontCss}</style>` : "") +
    `<rect width="${width}" height="${height}" fill="#0e1012"/>` +
    `<g font-family="${escapeXml(options.fontFamily)}" font-size="${FONT_SIZE}">${out.join("")}</g>` +
    `</svg>`;

  return { svg, width, height };
}
