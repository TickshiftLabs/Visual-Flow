import {
  clickEmptyCanvas,
  expect,
  inspector,
  MISSION,
  MISSION_DATA,
  node,
  openEditor,
  row,
  setJson,
  test,
  viewTab,
} from "./helpers";

const clipboard = (page: import("@playwright/test").Page) =>
  page.evaluate(() => navigator.clipboard.readText());

test("inspector shows where a node is and what's in it, with working copies", async ({ page }) => {
  await openEditor(page, MISSION);
  const panel = inspector(page);
  await expect(panel).toBeHidden();

  await node(page, "payload", "orbit").click();
  await expect(panel.locator("header")).toContainText("orbit");
  await expect(panel.locator("[data-field=jsonpath]")).toHaveText("$.payload.orbit");
  await expect(panel.locator("[data-field=accessor]")).toHaveText("data?.payload?.orbit");
  expect(JSON.parse((await panel.locator("[data-field=contents]").textContent())!)).toEqual(
    MISSION_DATA.payload.orbit
  );
  await expect(panel.locator("[data-field=details]")).toContainText(/object.*2 keys.*26–29/);

  await panel.getByRole("button", { name: "Copy JSONPath" }).click();
  await expect(panel.getByRole("button", { name: "Copy JSONPath" })).toHaveText("copied");
  expect(await clipboard(page)).toBe("$.payload.orbit");

  await panel.getByRole("button", { name: "Copy JavaScript accessor" }).click();
  const code = await clipboard(page);
  expect(new Function("data", `return ${code}`)(MISSION_DATA)).toEqual(MISSION_DATA.payload.orbit);

  await panel.getByRole("button", { name: "Copy value" }).click();
  expect(JSON.parse(await clipboard(page))).toEqual(MISSION_DATA.payload.orbit);

  // Follows the selection, updates with edits, and closes.
  await node(page, "vehicle").click();
  await expect(panel.locator("[data-field=jsonpath]")).toHaveText("$.vehicle");
  await setJson(page, MISSION.replace('"stages": 3', '"stages": 4'));
  await expect(panel.locator("[data-field=contents]")).toContainText('"stages": 4');

  await panel.getByRole("button", { name: "Close inspector" }).click();
  await expect(panel).toBeHidden();
  await node(page, "launch").click();
  await expect(panel).toBeVisible();
  await clickEmptyCanvas(page);
  await expect(panel).toBeHidden();
});

test("single values can be inspected from the tree, and survive a view switch", async ({ page }) => {
  await openEditor(page, MISSION, { view: "tree" });
  await row(page, "launch", "weatherGo").click();
  const panel = inspector(page);
  await expect(panel.locator("[data-field=jsonpath]")).toHaveText("$.launch.weatherGo");
  await expect(panel.locator("[data-field=contents]")).toHaveText("true");
  await expect(panel.locator("[data-field=details]")).toContainText("boolean");

  await viewTab(page, "Graph").click();
  await expect(panel.locator("[data-field=jsonpath]")).toHaveText("$.launch.weatherGo");
});

test("awkward keys get paths that still work", async ({ page }) => {
  const odd = { "a key": [{ "it's": { "x.y": 7 } }] };
  await openEditor(page, JSON.stringify(odd), { view: "tree" });
  const panel = inspector(page);

  await row(page, "a key", 0, "it's").click();
  await expect(panel.locator("[data-field=jsonpath]")).toHaveText("$['a key'][0]['it\\'s']");
  const code = (await panel.locator("[data-field=accessor]").textContent())!;
  expect(new Function("data", `return ${code}`)(odd)).toEqual({ "x.y": 7 });
});

test("huge values are previewed, but copied in full", async ({ page }) => {
  const big = { big: Array.from({ length: 3000 }, (_, i) => i) };
  await openEditor(page, JSON.stringify(big), { view: "tree" });
  const panel = inspector(page);

  await row(page, "big").click();
  const contents = panel.locator("[data-field=contents]");
  await expect(contents).toContainText("more characters");
  expect((await contents.textContent())!.length).toBeLessThan(6200);
  await panel.getByRole("button", { name: "Copy value" }).click();
  expect(JSON.parse(await clipboard(page))).toHaveLength(3000);
});
