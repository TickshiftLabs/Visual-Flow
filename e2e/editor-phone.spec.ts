import {
  expect,
  highlightedCode,
  inspector,
  litEdges,
  MISSION,
  node,
  nodes,
  openEditor,
  row,
  rows,
  test,
  viewTab,
} from "./helpers";

test.use({ viewport: { width: 390, height: 800 }, hasTouch: true });

const SMALL = JSON.stringify(
  { order: 4821, customer: { name: "Ada", address: { city: "Leeds" } } },
  null,
  2
);

test("phone layout: code on top, views underneath, nothing off screen", async ({ page }) => {
  await openEditor(page, SMALL);
  const code = page.locator(".monaco-editor").first();
  const canvas = page.locator(".react-flow");
  await expect(nodes(page)).toHaveCount(3);

  // The code editor sizes itself a moment after it appears, so wait for it.
  await expect.poll(async () => (await code.boundingBox())?.width ?? 0).toBeGreaterThan(370); // full width
  const [codeBox, canvasBox] = [(await code.boundingBox())!, (await canvas.boundingBox())!];
  expect(canvasBox.width).toBeGreaterThan(370);
  expect(canvasBox.y).toBeGreaterThanOrEqual(codeBox.y + codeBox.height - 1); // stacked
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

  // With no saved preference, a phone starts top to bottom: children below parents.
  const rootBox = (await node(page).boundingBox())!;
  const childBox = (await node(page, "customer").boundingBox())!;
  expect(childBox.y).toBeGreaterThan(rootBox.y + rootBox.height);
  // ...and the whole graph fits the canvas.
  for (const box of [rootBox, childBox, (await node(page, "customer", "address").boundingBox())!]) {
    expect(box.x).toBeGreaterThanOrEqual(canvasBox.x);
    expect(box.x + box.width).toBeLessThanOrEqual(canvasBox.x + canvasBox.width + 1);
  }

  // The zoom buttons and legend are left out on phones.
  await expect(page.locator(".react-flow__panel")).toHaveCount(2);
  await expect(page.locator(".react-flow__panel").first()).toBeHidden();
});

test("phone: tapping a node highlights its code and opens the inspector as a sheet", async ({ page }) => {
  await openEditor(page, SMALL);
  await node(page, "customer").tap();
  await expect(litEdges(page)).toHaveCount(1);
  await expect.poll(async () => (await highlightedCode(page))?.text).toMatch(/^"customer": \{/);

  const sheet = inspector(page);
  await expect(sheet.locator("[data-field=jsonpath]")).toHaveText("$.customer");
  const view = page.viewportSize()!;
  const box = (await sheet.boundingBox())!;
  expect(box.width).toBeGreaterThan(370); // spans the screen
  expect(box.y + box.height).toBeGreaterThan(view.height - 60); // sits at the bottom
  expect(box.y).toBeGreaterThan(view.height * 0.3); // and doesn't cover everything

  await sheet.getByRole("button", { name: "Close inspector" }).tap();
  await expect(sheet).toBeHidden();
});

test("phone: tree and 3D views work, and the divider resizes the code panel", async ({ page }) => {
  await openEditor(page, MISSION);
  await viewTab(page, "Tree").tap();
  await expect(rows(page).first()).toBeVisible();
  await row(page, "launch").tap();
  await expect(row(page, "launch")).toHaveAttribute("aria-selected", "true");
  await inspector(page).getByRole("button", { name: "Close inspector" }).tap();

  await viewTab(page, "3D").tap();
  await expect(page.locator(".vf-3d canvas")).toBeVisible();

  // Drag the divider down: the code panel gets taller.
  const divider = page.getByRole("separator", { name: "Resize the code panel" });
  const code = page.locator(".monaco-editor").first();
  const before = (await code.boundingBox())!.height;
  const grip = (await divider.boundingBox())!;
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + grip.width / 2, grip.y + 160, { steps: 6 });
  await page.mouse.up();
  await expect.poll(async () => (await code.boundingBox())!.height).toBeGreaterThan(before + 100);
});

test("phone: screenshots for review", async ({ page }) => {
  const dir = process.env.SHOT_DIR;
  test.skip(!dir, "set SHOT_DIR to capture review screenshots");
  await openEditor(page, SMALL);
  await expect(nodes(page)).toHaveCount(3);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${dir}/phone-1-graph.png` });
  await node(page, "customer").tap();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${dir}/phone-2-inspector.png` });
  await inspector(page).getByRole("button", { name: "Close inspector" }).tap();
  await viewTab(page, "Tree").tap();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${dir}/phone-3-tree.png` });
  await viewTab(page, "3D").tap();
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${dir}/phone-4-3d.png` });
});
