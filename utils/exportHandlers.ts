import { toPng, toJpeg, toSvg } from "html-to-image";
import { saveAs } from "file-saver";
import { successToast, errorToast } from "../lib/toast";

type Format = "png" | "jpeg" | "svg";

const BACKGROUND = "#0e1012";
const DEFAULT_FILENAME = "json-visualization";

const renderers = { png: toPng, jpeg: toJpeg, svg: toSvg };
const extensions: Record<Format, string> = { png: "png", jpeg: "jpg", svg: "svg" };
const labels: Record<Format, string> = { png: "PNG", jpeg: "JPG", svg: "SVG" };

/** Leaves on-canvas UI (legend, zoom buttons) out of the exported image. */
const excludeUi = (node: HTMLElement) =>
  !node.classList?.contains("react-flow__panel");

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
 * Builds @font-face CSS with the font files inlined, for the fonts the page
 * has actually loaded. Passing this to html-to-image stops it crawling every
 * stylesheet itself, which fails noisily on cross-origin ones (Monaco's CDN).
 */
async function buildFontCss(): Promise<string> {
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
      const family = style.getPropertyValue("font-family").replace(/["']/g, "");
      const key = `${family}|${style.getPropertyValue("font-weight")}|${style.getPropertyValue("unicode-range")}`;
      const url = /url\(["']?([^"')]+)["']?\)/.exec(style.getPropertyValue("src"))?.[1];
      if (!loaded.has(key) || !url) continue;
      const data = await toDataUrl(new URL(url, sheet.href ?? location.href).href);
      faces.push(rule.cssText.replace(/url\([^)]+\)/, `url(${data})`));
    }
  }
  return faces.join("\n");
}

/** Fits the whole graph in view and waits for the animation to settle. */
async function fitGraphToView() {
  const instance = (window as any).reactFlowInstance;
  if (typeof instance?.fitView !== "function") return;
  instance.fitView({ padding: 0.12 });
  await new Promise((resolve) => setTimeout(resolve, 400));
}

async function exportGraph(
  format: Format,
  selector: string,
  filename: string,
  quality?: number
) {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) {
    errorToast("Switch to the Graph view to export an image.");
    return;
  }
  if (element.querySelectorAll(".react-flow__node").length === 0) {
    errorToast("No data to export. Please add valid JSON data first.");
    return;
  }

  try {
    await fitGraphToView();

    const dataUrl = await renderers[format](element, {
      backgroundColor: BACKGROUND,
      width: element.clientWidth,
      height: element.clientHeight,
      filter: excludeUi,
      fontEmbedCSS: await buildFontCss(),
      ...(format === "svg" ? {} : { pixelRatio: 3 }),
      ...(quality !== undefined ? { quality } : {}),
    });

    saveAs(dataUrl, `${filename}.${extensions[format]}`);
    successToast(`${labels[format]} image exported successfully!`);
  } catch (error) {
    console.error(`Error exporting as ${labels[format]}:`, error);
    errorToast(
      `Failed to export as ${labels[format]}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export const exportAsPng = (
  selector: string = ".react-flow",
  filename: string = DEFAULT_FILENAME
) => exportGraph("png", selector, filename);

export const exportAsJpeg = (
  selector: string = ".react-flow",
  filename: string = DEFAULT_FILENAME,
  quality: number = 0.95
) => exportGraph("jpeg", selector, filename, quality);

export const exportAsSvg = (
  selector: string = ".react-flow",
  filename: string = DEFAULT_FILENAME
) => exportGraph("svg", selector, filename);
