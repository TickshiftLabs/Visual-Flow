import type { GraphSvg } from "./graphSvg";

/**
 * How a view hands its current contents to image export. The Tree and 3D
 * views register one while they're on screen; the Graph view needs none
 * because export can rebuild it from the document and settings.
 */
export type ViewExporter =
  | {
      kind: "svg";
      render: (font: { family: string; css: string }) => GraphSvg;
    }
  | { kind: "canvas"; render: () => HTMLCanvasElement };

const exporters = new Map<string, ViewExporter>();

/** Registers (or, with null, removes) the exporter for a view. */
export function setViewExporter(view: string, exporter: ViewExporter | null) {
  if (exporter) exporters.set(view, exporter);
  else exporters.delete(view);
}

export const getViewExporter = (view: string) => exporters.get(view);
