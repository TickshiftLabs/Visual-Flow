import {
  dropFile,
  editorReady,
  expect,
  getJson,
  menu,
  nodes,
  openEditor,
  setJson,
  statusBar,
  test,
  toast,
} from "./helpers";

test("first visit: empty screen, then an example in one click", async ({ page }) => {
  await openEditor(page);
  await expect(page.getByText("Nothing to draw yet.")).toBeVisible();
  await expect(statusBar(page)).toContainText("no JSON yet");

  await page.getByRole("button", { name: "Load an example" }).click();
  await expect(nodes(page)).toHaveCount(7);
  await expect(statusBar(page)).toContainText(/valid JSON.*32 lines.*7 nodes.*depth 3/);
  await expect(page.locator("header")).toContainText("order.json");
});

test("the graph follows edits and survives invalid JSON", async ({ page }) => {
  await openEditor(page, '{"a": 1, "b": {"c": 2}}');
  await expect(nodes(page)).toHaveCount(2);

  await setJson(page, '{"a": 1, "b": {"c": 2}, "d": {"e": 3}}');
  await expect(nodes(page)).toHaveCount(3);

  await setJson(page, '{"a": 1, "b": {"c": 2}');
  await expect(page.getByText("Check for a missing comma")).toBeVisible();
  await expect(statusBar(page)).toContainText("invalid JSON");
  await expect(nodes(page)).toHaveCount(3); // last valid graph stays

  await setJson(page, "");
  await expect(page.getByText("Nothing to draw yet.")).toBeVisible();
});

test("Edit menu formats, minimises and copies", async ({ page }) => {
  await openEditor(page, '{"b":1,"a":[1,2]}');
  await menu(page, "Edit", "Format");
  expect(await getJson(page)).toBe(JSON.stringify({ b: 1, a: [1, 2] }, null, 2));

  await menu(page, "Edit", "Minimize");
  expect(await getJson(page)).toBe('{"b":1,"a":[1,2]}');

  await menu(page, "Edit", "Copy");
  await expect(toast(page).last()).toContainText("copied");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('{"b":1,"a":[1,2]}');
});

test("dropping a file loads it; other file types are refused", async ({ page }) => {
  await openEditor(page, '{"old": true}');
  await dropFile(page, "dropped.json", "application/json", '{"dropped": {"yes": 1}}');
  await expect(page.locator("header")).toContainText("dropped.json");
  await expect(nodes(page)).toHaveCount(2);
  expect(await getJson(page)).toContain('"dropped"');

  await dropFile(page, "notes.txt", "text/plain", "not json");
  await expect(toast(page).last()).toContainText("Only JSON files");
  expect(await getJson(page)).toContain('"dropped"');
});

test("work is restored after a reload", async ({ page }) => {
  await openEditor(page);
  await setJson(page, '{"kept": {"after": "reload"}}');
  // Autosave is debounced; wait for it to land before reloading.
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("json_visualizer_data") ?? ""))
    .toContain("kept");

  await page.reload();
  await editorReady(page);
  expect(await getJson(page)).toBe('{"kept": {"after": "reload"}}');
  await expect(nodes(page)).toHaveCount(2);
});

test("View menu hides and shows the code panel", async ({ page }) => {
  await openEditor(page, '{"a": {"b": 1}}');
  const code = page.locator(".monaco-editor").first();
  await expect(code).toBeInViewport();
  await menu(page, "View", "Code panel");
  await expect(code).not.toBeInViewport();
  await menu(page, "View", "Code panel");
  await expect(code).toBeInViewport();
});
