import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test as base, type Locator, type Page } from "@playwright/test";

const sample = (name: string) =>
  readFileSync(join(__dirname, "..", "samples", name), "utf8").trimEnd();

/** 37 lines, 8 graph nodes. */
export const MISSION = sample("mission-demo.json");
export const MISSION_DATA = JSON.parse(MISSION);
/** 1,968 lines, 340 graph nodes. */
export const ORDERS = sample("orders-50.json");

/**
 * Every test fails if the page logs an error or throws, whatever else it
 * checks. Add patterns to `allowed` in a test to expect specific messages.
 */
export const test = base.extend<{ allowed: RegExp[] }>({
  allowed: [[], { option: true }],
  page: async ({ page, allowed }, use) => {
    const problems: string[] = [];
    page.on("pageerror", (error) => problems.push(`uncaught: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") problems.push(`console.error: ${message.text()}`);
    });
    await use(page);
    expect(problems.filter((p) => !allowed.some((re) => re.test(p)))).toEqual([]);
  },
});
export { expect };

/**
 * Opens the editor. With `json`, the document is already loaded when the page
 * appears (seeded the same way autosave restores it), so no typing is needed.
 */
export async function openEditor(
  page: Page,
  json?: string,
  settings: Record<string, unknown> = {}
) {
  await page.addInitScript(
    ([content, prefs]) => {
      // Seed once per browser context, so reloads keep whatever the test saved.
      if (sessionStorage.getItem("seeded")) return;
      sessionStorage.setItem("seeded", "1");
      localStorage.clear();
      localStorage.setItem("json_visualizer_settings", JSON.stringify(prefs));
      if (content !== null) {
        localStorage.setItem(
          "json_visualizer_data",
          JSON.stringify({ content, lastModified: 0 })
        );
      }
    },
    [json ?? null, settings] as const
  );
  await page.goto("/editor");
  await editorReady(page);
}

export const editorReady = (page: Page) =>
  page.waitForFunction(() => !!(window as any).monaco?.editor.getModels().length);

/** Replaces the editor's text, as if the user pasted over everything. */
export const setJson = (page: Page, text: string) =>
  page.evaluate((value) => (window as any).monaco.editor.getModels()[0].setValue(value), text);

export const getJson = (page: Page): Promise<string> =>
  page.evaluate(() => (window as any).monaco.editor.getModels()[0].getValue());

/** A graph node by the path of its value, e.g. `node(page, "payload", "orbit")`. */
export function node(page: Page, ...path: Array<string | number>): Locator {
  return page.locator(`.react-flow__node[data-id=${attr(pathId(path))}]`);
}

export const nodes = (page: Page) => page.locator(".react-flow__node");
export const litEdges = (page: Page) => page.locator(".react-flow__edge.vf-edge-on");

/** A tree row by the path of its value. */
export function row(page: Page, ...path: Array<string | number>): Locator {
  return page.locator(`[role=treeitem][data-id=${attr(pathId(path))}]`);
}

export const rows = (page: Page) => page.locator("[role=treeitem]");

/** Quotes a value for a CSS attribute selector, whatever characters it contains. */
const attr = (value: string) => JSON.stringify(value);

/** Same id format the app uses: `$`, `$."user"`, `$."items"[0]`. */
export const pathId = (path: Array<string | number>) =>
  path.reduce<string>(
    (id, seg) => (typeof seg === "number" ? `${id}[${seg}]` : `${id}.${JSON.stringify(seg)}`),
    "$"
  );

export const viewTab = (page: Page, name: "Graph" | "Tree" | "3D") =>
  page.getByRole("tab", { name, exact: true });

export const statusBar = (page: Page) => page.locator("main > div").last();
export const inspector = (page: Page) => page.getByRole("complementary", { name: "Inspector" });
export const toast = (page: Page) => page.locator(".vf-toast");

/** Opens a top-bar menu and clicks through the given items. */
export async function menu(page: Page, name: "File" | "Edit" | "View", ...items: string[]) {
  await page.locator("header").getByRole("button", { name, exact: true }).click();
  for (const item of items) await page.getByRole("menuitem", { name: item }).click();
}

export async function setSetting(page: Page, group: string, option: string) {
  await menu(page, "View", "Settings…");
  await page.getByRole("radiogroup", { name: group }).getByRole("radio", { name: option }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
}

/** Clicks a spot on the graph canvas with nothing on it. */
export async function clickEmptyCanvas(page: Page) {
  const point = await page.evaluate(() => {
    const r = document.querySelector(".react-flow")!.getBoundingClientRect();
    for (let y = r.top + 30; y < r.bottom - 20; y += 24) {
      for (let x = r.left + 20; x < r.right - 20; x += 24) {
        if (document.elementFromPoint(x, y)?.classList.contains("react-flow__pane")) return { x, y };
      }
    }
    return null;
  });
  if (!point) throw new Error("no empty spot on the canvas");
  await page.mouse.click(point.x, point.y);
}

/** Lines highlighted in the code editor for the current selection, or null. */
export const highlightedCode = (page: Page) =>
  page.evaluate(() => {
    const editor = (window as any).monaco.editor.getEditors()[0];
    const model = editor.getModel();
    const mark = model
      .getAllDecorations()
      .find((d: any) => d.options.className === "vf-line-selected");
    if (!mark) return null;
    const visible = editor.getVisibleRanges()[0];
    return {
      text: model.getValueInRange(mark.range).trim() as string,
      from: mark.range.startLineNumber as number,
      to: mark.range.endLineNumber as number,
      onScreen:
        mark.range.startLineNumber >= visible.startLineNumber &&
        mark.range.startLineNumber <= visible.endLineNumber,
    };
  });

/** Runs an export from the File menu and returns the downloaded file. */
export async function exportImage(page: Page, format: "PNG Image" | "JPG Image" | "SVG Vector") {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    menu(page, "File", "Export", format),
  ]);
  const body = readFileSync(await download.path());
  return { name: download.suggestedFilename(), body, text: body.toString("utf8") };
}

/** Width and height from a PNG file's header. */
export const pngSize = (png: Buffer) => ({
  isPng: png.readUInt32BE(0) === 0x89504e47,
  width: png.readUInt32BE(16),
  height: png.readUInt32BE(20),
});

/** Drops a file onto the page, like dragging it in from the desktop. */
export const dropFile = (page: Page, name: string, type: string, text: string) =>
  page.evaluate(
    ([n, t, body]) => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([body], n, { type: t }));
      const main = document.querySelector("main")!;
      for (const event of ["dragenter", "dragover", "drop"]) {
        main.dispatchEvent(
          new DragEvent(event, { bubbles: true, cancelable: true, dataTransfer: transfer })
        );
      }
    },
    [name, type, text] as const
  );

/** Opens the 3D view and waits for the scene; stops the idle spin so positions are stable. */
export async function open3d(page: Page) {
  await viewTab(page, "3D").click();
  await page.waitForFunction(
    () => !!(window as any).__vf3d && !!document.querySelector(".vf-3d canvas")
  );
  await page.evaluate(() => (window as any).__vf3d.stopSpin());
}

/** Where a node is drawn on screen in the 3D view. */
export const position3d = (page: Page, ...path: Array<string | number>) =>
  page.evaluate(
    (id) => (window as any).__vf3d.screenPosition(id) as { x: number; y: number },
    pathId(path)
  );
