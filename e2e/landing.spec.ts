import { expect, test } from "./helpers";

test("landing page shows the product and leads to the editor", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("See the shape of your JSON.");
  for (const id of ["features", "views", "how", "pricing"]) {
    await expect(page.locator(`#${id}`)).toBeAttached();
  }
  await expect(page.getByAltText(/Visual Flow editor/)).toBeVisible();

  await page.getByRole("link", { name: "Open the editor" }).first().click();
  await expect(page).toHaveURL(/\/editor$/);
});

test("views section on a wide screen: three live views sharing a selection", async ({ page }) => {
  await page.goto("/");
  const section = page.locator("#views");
  await section.scrollIntoViewIfNeeded();
  await expect(section.locator("[data-layout]")).toHaveAttribute("data-layout", "stage");

  // Graph is live: real nodes that can be selected.
  await expect(section.locator(".react-flow__node")).toHaveCount(8);
  await section.locator(".react-flow__node", { hasText: "orbit" }).last().click();

  // The selection is still there in the tree...
  await section.getByRole("tab", { name: /Tree/ }).click();
  await expect(section.locator("[role=treeitem][aria-selected=true]")).toContainText("orbit");

  // ...and in 3D.
  await section.getByRole("tab", { name: /3D/ }).click();
  await expect(section.locator(".vf-3d canvas")).toBeVisible();
  await expect(section.locator(".vf-3d-label-selected")).toHaveText("orbit");
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 800 } });

  test("views section shows stills that open larger, with no live views", async ({ page }) => {
    await page.goto("/");
    const section = page.locator("#views");
    await section.scrollIntoViewIfNeeded();
    await expect(section.locator("[data-layout]")).toHaveAttribute("data-layout", "swipe");
    await expect(section.locator(".react-flow, .vf-3d, .vf-tree")).toHaveCount(0);

    // Three stills, each filling a frame of its own shape, so nothing is cropped.
    const stills = section.locator("button img");
    await expect(stills).toHaveCount(3);
    const first = stills.first();
    await expect(first).toBeVisible();
    const shape = await first.evaluate((img: HTMLImageElement) => {
      const frame = img.parentElement!.getBoundingClientRect();
      return {
        loaded: img.naturalWidth > 0,
        image: img.naturalWidth / img.naturalHeight,
        frame: frame.width / frame.height,
      };
    });
    expect(shape.loaded).toBe(true);
    expect(Math.abs(shape.image - shape.frame)).toBeLessThan(0.01);

    // The page itself never scrolls sideways; only the row does.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    await section.getByRole("button", { name: "Enlarge the Graph view" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText("Graph view");
    await expect(dialog.locator("img")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});
