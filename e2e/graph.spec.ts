import {
  clickEmptyCanvas,
  editorReady,
  expect,
  highlightedCode,
  litEdges,
  MISSION,
  MISSION_DATA,
  node,
  nodes,
  openEditor,
  ORDERS,
  setSetting,
  test,
} from "./helpers";

test("selecting a node outlines it and lights the route from the root", async ({ page }) => {
  await openEditor(page, MISSION);
  await node(page, "payload", "orbit").click();
  await expect(node(page, "payload", "orbit").locator("> div")).toHaveClass(/vf-node-selected/);
  await expect(litEdges(page)).toHaveCount(2);

  await clickEmptyCanvas(page);
  await expect(litEdges(page)).toHaveCount(0);
});

test("clicking a row folds and unfolds its branch", async ({ page }) => {
  await openEditor(page, MISSION);
  await expect(nodes(page)).toHaveCount(8);
  const payloadRow = node(page).getByTitle("Click to collapse").filter({ hasText: "payload" });
  await payloadRow.click();
  await expect(node(page, "payload")).toBeHidden();
  await expect(node(page, "payload", "orbit")).toBeHidden();
  await expect(node(page, "launch")).toBeVisible();

  await node(page).getByTitle("Click to expand").click();
  await expect(node(page, "payload", "orbit")).toBeVisible();
});

test("search highlights matches and fades the rest", async ({ page }) => {
  await openEditor(page, MISSION);
  await page.keyboard.press("Control+k");
  const search = page.getByPlaceholder("Search keys and values");
  await expect(search).toBeFocused();

  await search.fill("kenji");
  await expect(node(page, "crew", 1).locator("> div")).not.toHaveClass(/opacity-25/);
  await expect(node(page, "launch").locator("> div")).toHaveClass(/opacity-25/);

  await search.press("Escape");
  await expect(search).toHaveValue("");
  await expect(node(page, "launch").locator("> div")).not.toHaveClass(/opacity-25/);
});

test("selecting a node highlights its JSON and scrolls the code to it", async ({ page }) => {
  await openEditor(page, ORDERS);
  await expect(node(page)).toBeVisible();
  // Bring a node from deep in the file into view, as a person would by panning.
  const id = '$."orders"[40]."shipping"."address"';
  await page.evaluate(
    (nodeId) => (window as any).reactFlowInstance.fitView({ nodes: [{ id: nodeId }], maxZoom: 0.8 }),
    id
  );
  await node(page, "orders", 40, "shipping", "address").click();

  await expect.poll(async () => (await highlightedCode(page))?.onScreen).toBe(true);
  const mark = (await highlightedCode(page))!;
  expect(mark.from).toBeGreaterThan(1000);
  const value = JSON.parse(mark.text.replace(/^"address":\s*/, "").replace(/,$/, ""));
  expect(value).toEqual(JSON.parse(ORDERS).orders[40].shipping.address);
});

test("a big file opens at a readable zoom on the root", async ({ page }) => {
  await openEditor(page, ORDERS);
  await expect(node(page)).toBeInViewport();
  await expect(page.locator(".react-flow__panel").getByText("80%")).toBeVisible();
});

test("direction setting lays the graph out top to bottom, and is remembered", async ({ page }) => {
  await openEditor(page, MISSION);
  const box = async (...path: Array<string | number>) => (await node(page, ...path).boundingBox())!;
  // Layout animates into place, so poll rather than read once.
  await expect
    .poll(async () => (await box("launch")).x > (await box()).x + (await box()).width)
    .toBe(true);

  await setSetting(page, "Direction", "Top to bottom");
  await expect
    .poll(async () => (await box("launch")).y > (await box()).y + (await box()).height)
    .toBe(true);
  await expect(node(page)).toContainText("↓");
  await expect(page.locator(".react-flow__edge")).toHaveCount(7);

  await page.reload();
  await editorReady(page);
  await expect
    .poll(async () => (await box("launch")).y > (await box()).y + (await box()).height)
    .toBe(true);
});

test("node shadows can be switched off", async ({ page }) => {
  await openEditor(page, MISSION);
  const card = node(page).locator("> div");
  await expect(card).toHaveCSS("box-shadow", /30px/);
  await setSetting(page, "Node shadows", "Off");
  await expect(card).toHaveCSS("box-shadow", "none");
});

test("unusual documents draw without errors", async ({ page }) => {
  const odd = [{ "": 1, "a.b": { c: 1 }, 'q"uote': { z: [[1, 2], []] }, "🙂": { u: "é漢字" } }, 3, null];
  await openEditor(page, JSON.stringify(odd));
  await expect(nodes(page)).toHaveCount(7);
  expect(MISSION_DATA.mission).toBe("Aurora-7"); // sample sanity
});
