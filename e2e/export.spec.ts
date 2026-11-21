import {
  expect,
  exportImage,
  menu,
  MISSION,
  node,
  open3d,
  openEditor,
  pngSize,
  row,
  test,
  toast,
  viewTab,
} from "./helpers";

const count = (text: string, needle: string) => text.split(needle).length - 1;
const svgWidth = (svg: string) => Number(/width="(\d+)"/.exec(svg)![1]);

test("graph exports as a small vector SVG and as PNG and JPG", async ({ page }) => {
  await openEditor(page, MISSION);
  await expect(node(page)).toBeVisible();

  const svg = await exportImage(page, "SVG Vector");
  expect(svg.name).toBe("json-visualization.svg");
  expect(count(svg.text, 'rx="9"')).toBe(8); // one card per node
  expect(svg.text).toContain(">root</text>");
  expect(svg.text).toContain("@font-face");
  expect(svg.text).not.toContain("foreignObject");
  expect(svg.body.length).toBeLessThan(300_000);

  const png = await exportImage(page, "PNG Image");
  expect(png.name).toBe("json-visualization.png");
  expect(pngSize(png.body)).toMatchObject({ isPng: true, width: 2 * svgWidth(svg.text) });

  const jpg = await exportImage(page, "JPG Image");
  expect(jpg.name).toBe("json-visualization.jpg");
  expect(jpg.body.readUInt16BE(0)).toBe(0xffd8);
});

test("folded branches are left out of the export", async ({ page }) => {
  await openEditor(page, MISSION);
  await node(page).getByTitle("Click to collapse").filter({ hasText: "payload" }).click();
  await expect(node(page, "payload")).toBeHidden();
  const svg = await exportImage(page, "SVG Vector");
  expect(count(svg.text, 'rx="9"')).toBe(5);
  expect(svg.text).toContain(">+</text>");
});

test("tree view exports the tree", async ({ page }) => {
  await openEditor(page, MISSION, { view: "tree" });
  await row(page, "crew").getByRole("button").click();
  const svg = await exportImage(page, "SVG Vector");
  expect(svg.name).toBe("json-visualization-tree.svg");
  expect(svg.text).not.toContain('rx="9"'); // no node cards
  expect(count(svg.text, "<text")).toBe(22 * 2); // every visible row
  expect(svg.text).toContain(">weatherGo</text>");
  expect(svg.text).not.toContain("Kenji"); // folded away

  const png = await exportImage(page, "PNG Image");
  expect(png.name).toBe("json-visualization-tree.png");
  expect(pngSize(png.body)).toMatchObject({ isPng: true, width: 2 * svgWidth(svg.text) });
});

test("3D view exports the scene as an image, and declines SVG", async ({ page }) => {
  await openEditor(page, MISSION);
  await open3d(page);
  const canvas = await page
    .locator(".vf-3d canvas")
    .evaluate((c: HTMLCanvasElement) => ({ width: c.width, height: c.height }));

  const png = await exportImage(page, "PNG Image");
  expect(png.name).toBe("json-visualization-3d.png");
  expect(pngSize(png.body)).toMatchObject({ isPng: true, ...canvas });

  // The picture has the lime root in it, so it isn't a blank canvas.
  const lime = await page.evaluate(async (base64) => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${base64}`)).blob());
    const c = document.createElement("canvas");
    c.width = bitmap.width;
    c.height = bitmap.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0);
    const px = ctx.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let i = 0; i < px.length; i += 16) if (px[i + 1] > 180 && px[i] > 140 && px[i + 2] < 140) n++;
    return n;
  }, png.body.toString("base64"));
  expect(lime).toBeGreaterThan(20);

  await menu(page, "File", "Export", "SVG Vector");
  await expect(toast(page).last()).toContainText("3D view exports as PNG or JPG");

  // Back in the graph, export is the graph again.
  await viewTab(page, "Graph").click();
  expect((await exportImage(page, "SVG Vector")).name).toBe("json-visualization.svg");
});
