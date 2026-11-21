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

test("the views section has a live 3D graph and screenshots of the others", async ({ page }) => {
  await page.goto("/");
  const section = page.locator("#views");
  await section.scrollIntoViewIfNeeded();

  // 3D is live: a real scene that can switch layout.
  const scene = section.locator(".vf-3d");
  await expect(scene.locator("canvas")).toBeVisible();
  await expect(scene).toHaveAttribute("data-layout", "constellation");
  await section.getByRole("button", { name: "Cone tree" }).click();
  await expect(scene).toHaveAttribute("data-layout", "cone");

  await section.getByRole("tab", { name: "Graph" }).click();
  await expect(section.getByAltText(/Graph view/)).toBeVisible();
  await expect(scene).toHaveCount(0);

  await section.getByRole("tab", { name: "Tree" }).click();
  await expect(section.getByAltText(/Tree view/)).toBeVisible();
});
