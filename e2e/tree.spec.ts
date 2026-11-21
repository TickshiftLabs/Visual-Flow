import {
  editorReady,
  expect,
  highlightedCode,
  MISSION,
  node,
  openEditor,
  ORDERS,
  row,
  rows,
  statusBar,
  test,
  viewTab,
} from "./helpers";

test("the tree lists every key and folds", async ({ page }) => {
  await openEditor(page, MISSION, { view: "tree" });
  await expect(rows(page)).toHaveCount(28);

  await row(page, "crew").getByRole("button").click();
  await expect(rows(page)).toHaveCount(22);
  await expect(row(page, "crew")).toHaveAttribute("aria-expanded", "false");
  await row(page, "crew").getByRole("button").click();
  await expect(rows(page)).toHaveCount(28);
});

test("selection is shared between graph and tree", async ({ page }) => {
  await openEditor(page, MISSION);
  await node(page, "payload", "orbit").click();
  await viewTab(page, "Tree").click();
  await expect(row(page, "payload", "orbit")).toHaveAttribute("aria-selected", "true");

  await row(page, "launch").click();
  await viewTab(page, "Graph").click();
  await expect(node(page, "launch").locator("> div")).toHaveClass(/vf-node-selected/);
});

test("clicking a value highlights its line; a branch, its block", async ({ page }) => {
  await openEditor(page, MISSION, { view: "tree" });
  await row(page, "vehicle", "stages").click();
  await expect.poll(async () => (await highlightedCode(page))?.text).toBe('"stages": 3,');

  await row(page, "launch").click();
  await expect
    .poll(async () => (await highlightedCode(page))?.text)
    .toMatch(/^"launch": \{[\s\S]*"weatherGo": true/);
});

test("search narrows the tree to matches and their parents", async ({ page }) => {
  await openEditor(page, MISSION, { view: "tree" });
  const search = page.getByPlaceholder("Search keys and values");
  await search.fill("kenji");
  await expect(rows(page)).toHaveCount(4);
  await expect(row(page, "crew", 1, "name")).toBeVisible();

  await search.fill("zzz");
  await expect(page.getByText("Nothing matches")).toBeVisible();
});

test("a big file opens folded, and only on-screen rows are drawn", async ({ page }) => {
  await openEditor(page, ORDERS, { view: "tree" });
  const tree = page.getByRole("tree");
  // 54 rows: root, two values, the orders list and its 50 folded items.
  await expect.poll(async () => Math.round((await tree.boundingBox())!.height / 27)).toBe(54);
  expect(await rows(page).count()).toBeLessThan(54);
  await expect(statusBar(page)).toContainText("340 nodes");
});

test("the chosen view is remembered", async ({ page }) => {
  await openEditor(page, MISSION);
  await viewTab(page, "Tree").click();
  await expect(rows(page)).toHaveCount(28);
  await page.reload();
  await editorReady(page);
  await expect(viewTab(page, "Tree")).toHaveAttribute("aria-selected", "true");
});
