import { saveAs } from "file-saver";
import { successToast, errorToast } from "../lib/toast";
import {
  buildGraph,
  descendantsOf,
} from "@/app/editor/components/Visualizers/graph/buildGraph";
import { layoutGraph } from "@/app/editor/components/Visualizers/graph/graphLayout";
import { collapseKey, useGraphStore } from "@/store/useGraphStore";
import { useJsonStore } from "@/store/useJsonStore";
import { renderGraphSvg, type GraphSvg, type SvgNode } from "./graphSvg";
import { getViewExporter } from "./exportSource";

type Format = "png" | "jpeg" | "svg";

const DEFAULT_FILENAME = "json-visualization";
const extensions: Record<Format, string> = { png: "png", jpeg: "jpg", svg: "svg" };
const labels: Record<Format, string> = { png: "PNG", jpeg: "JPG", svg: "SVG" };

/**
 * Raster images are drawn at 2x for sharpness. Very tall or wide graphs are
 * scaled down to stay inside what browsers can draw, and if the browser still
 * refuses (limits vary), the export retries smaller.
 */
const RASTER_SCALE = 2;
const MAX_SIDE = 32000;
const MAX_PIXELS = 200_000_000;
const MIN_SCALE = 0.25;

const FALLBACK_FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

const toDataUrl = async (url: string) => {
  const blob = await (await fetch(url)).blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * The node font as CSS with the font files inlined, limited to the weights
 * and character ranges the page has actually loaded. Embedding it means the
 * image looks the same on a machine without the font. Cached after first use.
 */
let fontCache: Promise<{ family: string; css: string }> | null = null;
function nodeFont(): Promise<{ family: string; css: string }> {
  fontCache ??= (async () => {
    const family = getComputedStyle(document.documentElement)
      .getPropertyValue("--font-jetbrains-mono")
      .trim();
    if (!family) return { family: FALLBACK_FONT, css: "" };
    const names = family.split(",").map((f) => f.trim().replace(/["']/g, ""));

    const loaded = new Set(
      [...document.fonts]
        .filter((f) => f.status === "loaded")
        .map((f) => `${f.family.replace(/["']/g, "")}|${f.weight}|${f.unicodeRange}`)
    );

    const faces: string[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue; // cross-origin stylesheet
      }
      for (const rule of Array.from(rules)) {
        if (!(rule instanceof CSSFontFaceRule)) continue;
        const style = rule.style;
        const name = style.getPropertyValue("font-family").replace(/["']/g, "");
        if (!names.includes(name)) continue;
        const key = `${name}|${style.getPropertyValue("font-weight")}|${style.getPropertyValue("unicode-range")}`;
        const url = /url\(["']?([^"')]+)["']?\)/.exec(style.getPropertyValue("src"))?.[1];
        if (!loaded.has(key) || !url) continue;
        const data = await toDataUrl(new URL(url, sheet.href ?? location.href).href);
        faces.push(rule.cssText.replace(/url\([^)]+\)/, `url(${data})`));
      }
    }
    return { family: `${family}, ${FALLBACK_FONT}`, css: faces.join("") };
  })().catch(() => ({ family: FALLBACK_FONT, css: "" }));
  return fontCache;
}

/**
 * Gathers what to draw from the current document and settings. Node
 * positions come from the graph on screen when it's open (so dragged nodes
 * stay where they were put); otherwise from a fresh layout.
 */
function collectGraph() {
  const { visualizationJson, graphDirection, edgeType, showGrid } =
    useJsonStore.getState();
  let parsed: unknown;
  try {
    parsed = JSON.parse(visualizationJson);
  } catch {
    return null;
  }
  const graph = buildGraph(parsed);

  const { collapsed } = useGraphStore.getState();
  const foldedRoots: string[] = [];
  const collapsedRows = new Map<string, Set<number>>();
  for (const node of graph.nodes) {
    node.rows.forEach((row, i) => {
      if (row.children.length && collapsed.has(collapseKey(node.id, i))) {
        foldedRoots.push(...row.children);
        if (!collapsedRows.has(node.id)) collapsedRows.set(node.id, new Set());
        collapsedRows.get(node.id)!.add(i);
      }
    });
  }
  const hidden = descendantsOf(graph, foldedRoots);
  foldedRoots.forEach((id) => hidden.add(id));

  const onScreen = new Map<string, { x: number; y: number }>();
  const instance = (window as any).reactFlowInstance;
  if (document.querySelector(".react-flow") && typeof instance?.getNodes === "function") {
    for (const n of instance.getNodes()) onScreen.set(n.id, n.position);
  }
  const usable = graph.nodes.every((node) => onScreen.has(node.id));
  const positions = usable ? onScreen : layoutGraph(graph, graphDirection);

  const nodes: SvgNode[] = graph.nodes
    .filter((node) => !hidden.has(node.id))
    .map((node) => ({
      node,
      ...positions.get(node.id)!,
      collapsedRows: collapsedRows.get(node.id),
    }));

  return { nodes, edges: graph.edges, graphDirection, edgeType, showGrid };
}

/** Draws the SVG onto a canvas and returns it as PNG or JPEG. */
async function rasterise(image: GraphSvg, format: "png" | "jpeg", quality?: number) {
  const url = URL.createObjectURL(
    new Blob([image.svg], { type: "image/svg+xml;charset=utf-8" })
  );
  try {
    const img = new Image();
    img.src = url;
    await img.decode();

    let scale = Math.min(
      RASTER_SCALE,
      MAX_SIDE / image.width,
      MAX_SIDE / image.height,
      Math.sqrt(MAX_PIXELS / (image.width * image.height))
    );
    for (; scale >= MIN_SCALE; scale /= 2) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, `image/${format}`, quality)
      );
      if (blob) return blob;
    }
    throw new Error("This graph is too large for an image. Try SVG instead.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

const canvasBlob = (canvas: HTMLCanvasElement, format: "png" | "jpeg", quality?: number) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not create the image"))),
      `image/${format}`,
      quality
    )
  );

/** Exports whichever view is on screen: the graph, the tree, or the 3D scene. */
async function exportView(format: Format, filename: string, quality?: number) {
  const { view } = useJsonStore.getState();

  try {
    let blob: Blob;
    let suffix = "";

    if (view === "graph") {
      const scene = collectGraph();
      if (!scene || scene.nodes.length === 0) {
        errorToast("No data to export. Please add valid JSON data first.");
        return;
      }
      const font = await nodeFont();
      const image = renderGraphSvg(scene.nodes, scene.edges, {
        direction: scene.graphDirection,
        edgeType: scene.edgeType,
        showGrid: scene.showGrid,
        fontFamily: font.family,
        fontCss: font.css,
      });
      blob =
        format === "svg"
          ? new Blob([image.svg], { type: "image/svg+xml;charset=utf-8" })
          : await rasterise(image, format, quality);
    } else {
      const exporter = getViewExporter(view);
      if (!exporter) {
        errorToast("Nothing to export yet. Please add valid JSON data first.");
        return;
      }
      suffix = view === "tree" ? "-tree" : "-3d";

      if (exporter.kind === "svg") {
        const image = exporter.render(await nodeFont());
        blob =
          format === "svg"
            ? new Blob([image.svg], { type: "image/svg+xml;charset=utf-8" })
            : await rasterise(image, format, quality);
      } else {
        if (format === "svg") {
          // A 3D scene is pixels, not shapes; an "SVG" would only wrap a picture.
          errorToast("The 3D view exports as PNG or JPG. SVG is for the Graph and Tree views.");
          return;
        }
        blob = await canvasBlob(exporter.render(), format, quality);
      }
    }

    saveAs(blob, `${filename}${suffix}.${extensions[format]}`);
    successToast(`${labels[format]} image exported`);
  } catch (error) {
    console.error(`Error exporting as ${labels[format]}:`, error);
    errorToast(
      `Failed to export as ${labels[format]}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export const exportAsPng = (filename: string = DEFAULT_FILENAME) =>
  exportView("png", filename);

export const exportAsJpeg = (
  filename: string = DEFAULT_FILENAME,
  quality: number = 0.92
) => exportView("jpeg", filename, quality);

export const exportAsSvg = (filename: string = DEFAULT_FILENAME) =>
  exportView("svg", filename);
