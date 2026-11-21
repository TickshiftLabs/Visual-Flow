import {
  expect,
  highlightedCode,
  MISSION,
  node,
  open3d,
  openEditor,
  position3d,
  setSetting,
  test,
  viewTab,
} from "./helpers";

test("3D view: select, rotate, switch layout", async ({ page }) => {
  await openEditor(page, MISSION);
  await node(page, "payload").click();
  await open3d(page);

  const scene = page.locator(".vf-3d");
  await expect(scene).toHaveAttribute("data-nodes", "8");
  await expect(scene).toHaveAttribute("data-layout", "constellation");
  const selected = page.locator(".vf-3d-label-selected");
  await expect(selected).toHaveText("payload"); // carried over from the graph

  // Click a point to select it.
  const launch = await position3d(page, "launch");
  await page.mouse.click(launch.x, launch.y);
  await expect(selected).toHaveText("launch");
  await expect.poll(async () => (await highlightedCode(page))?.text).toMatch(/^"launch": \{/);

  // Dragging turns the scene and doesn't change the selection.
  const before = await position3d(page, "payload", "orbit");
  const box = (await scene.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 60);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 200, box.y + box.height - 60, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(async () => {
      const after = await position3d(page, "payload", "orbit");
      return Math.hypot(after.x - before.x, after.y - before.y);
    })
    .toBeGreaterThan(15);
  await expect(selected).toHaveText("launch");

  // Cone tree stacks levels from top to bottom.
  await setSetting(page, "Layout", "Cone tree");
  await expect(scene).toHaveAttribute("data-layout", "cone");
  await page.evaluate(() => (window as any).__vf3d.stopSpin());
  const [root, payload, orbit] = await Promise.all([
    position3d(page),
    position3d(page, "payload"),
    position3d(page, "payload", "orbit"),
  ]);
  expect(root.y).toBeLessThan(payload.y);
  expect(payload.y).toBeLessThan(orbit.y);

  // Leaving 3D tears the scene down; the selection comes back with you.
  await viewTab(page, "Graph").click();
  await expect(scene).toHaveCount(0);
  await expect(node(page, "launch").locator("> div")).toHaveClass(/vf-node-selected/);
});
