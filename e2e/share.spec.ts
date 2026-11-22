import {
  editorReady,
  expect,
  getJson,
  MISSION,
  node,
  nodes,
  openEditor,
  row,
  test,
  toast,
  viewTab,
} from "./helpers";

const clipboard = (page: import("@playwright/test").Page) =>
  page.evaluate(() => navigator.clipboard.readText());

/** Makes a share link from a page showing MISSION in the tree with `orbit` selected. */
async function makeLink(page: import("@playwright/test").Page) {
  await openEditor(page, MISSION);
  await node(page, "payload", "orbit").click();
  await viewTab(page, "Tree").click();
  await page.locator("header").getByRole("button", { name: "Share" }).click();
  await expect(toast(page).last()).toContainText("Link copied");
  return clipboard(page);
}

test("a share link carries the file, the view and the selection", async ({ page, browser }) => {
  const link = await makeLink(page);
  expect(link).toMatch(/\/editor#s=[A-Za-z0-9_-]+$/);
  // The file is in the part after #, which browsers don't send to servers.
  expect(new URL(link).search).toBe("");
  expect(link.length).toBeLessThan(1200);

  // Someone else, with nothing of their own saved, opens it.
  const context = await browser.newContext();
  const other = await context.newPage();
  await other.goto(link);
  await editorReady(other);
  await expect.poll(() => getJson(other)).toBe(MISSION);
  await expect(viewTab(other, "Tree")).toHaveAttribute("aria-selected", "true");
  await expect(row(other, "payload", "orbit")).toHaveAttribute("aria-selected", "true");
  await expect(other.locator("main > header")).toContainText("shared.json");
  // Nothing of theirs to protect, so no prompt, and the address is tidied.
  await expect(other.getByText("viewing a shared file")).toBeHidden();
  await expect.poll(() => other.evaluate(() => location.hash)).toBe("");
  await context.close();
});

test("opening a link never overwrites your own work without asking", async ({ page, browser }) => {
  const link = await makeLink(page);
  const mine = '{"my": {"own": "work"}}';

  const context = await browser.newContext();
  const other = await context.newPage();
  await openEditor(other, mine);
  await other.goto(link); // same page, new hash
  await expect.poll(() => getJson(other)).toBe(MISSION);
  const bar = other.getByRole("status").filter({ hasText: "viewing a shared file" });
  await expect(bar).toBeVisible();

  // Their saved copy is untouched while they look, even after an edit.
  const saved = () =>
    other.evaluate(() => JSON.parse(localStorage.getItem("json_visualizer_data")!).content);
  expect(await saved()).toBe(mine);

  await bar.getByRole("button", { name: "Back to mine" }).click();
  await expect(bar).toBeHidden();
  expect(await getJson(other)).toBe(mine);
  await expect(nodes(other)).toHaveCount(2);
  expect(await other.evaluate(() => location.hash)).toBe("");

  // Open it again and keep it this time: now it's saved as theirs.
  await other.goto(link);
  await expect(bar).toBeVisible();
  await bar.getByRole("button", { name: "Keep this" }).click();
  await expect(bar).toBeHidden();
  expect(await saved()).toBe(MISSION);
  await context.close();
});

test("a damaged link is reported and leaves your work alone", async ({ page }) => {
  const mine = '{"my": {"own": "work"}}';
  await openEditor(page, mine);
  await page.goto("/editor#s=this-is-not-a-real-link");
  await expect(toast(page).last()).toContainText("damaged or incomplete");
  expect(await getJson(page)).toBe(mine);
});

test("sharing needs valid JSON", async ({ page }) => {
  await openEditor(page);
  await page.locator("header").getByRole("button", { name: "Share" }).click();
  await expect(toast(page).last()).toContainText("Add valid JSON");
});
