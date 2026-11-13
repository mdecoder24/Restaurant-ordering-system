import { expect, test } from "@playwright/test";
import { createOwner, login } from "./fixtures";

test.describe("menu management (T07, D-04)", () => {
  test.skip(({ isMobile }) => isMobile, "Menu editing is a desktop/tablet task");

  test("owner builds a category and items, then marks one sold out", async ({ page }) => {
    const owner = await createOwner("menu");
    await login(page, owner, "/app/menu");

    await expect(page.getByText("Add your first category")).toBeVisible();
    await page.getByRole("button", { name: "Add category" }).first().click();
    await page.getByLabel("Name").fill("Starters");
    await page.getByRole("button", { name: "Add category" }).last().click();
    await expect(page.getByRole("navigation", { name: "Categories" }).getByText("Starters")).toBeVisible();

    for (const [name, price] of [["Gobi 65", "180"], ["Chicken Lollipop", "260.50"]] as const) {
      await page.getByRole("button", { name: "Add item" }).first().click();
      const sheet = page.getByRole("dialog");
      await sheet.getByLabel("Name").fill(name);
      await sheet.getByLabel("Price (₹)").fill(price);
      if (name.startsWith("Chicken")) await sheet.getByRole("radio", { name: "Non-veg" }).click();
      await sheet.getByRole("button", { name: "Add variant" }).click();
      await sheet.getByLabel("Variant name").fill("Half");
      await sheet.getByRole("button", { name: "Add item" }).click();
      await expect(sheet).toBeHidden();
    }

    const items = page.getByRole("region", { name: "Items" });
    await expect(items.getByText("Gobi 65")).toBeVisible();
    await expect(items.getByText("₹260.50")).toBeVisible();

    await items.getByRole("switch", { name: "Gobi 65 available" }).click();
    await expect(items.getByText("Sold out")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("region", { name: "Items" }).getByText("Sold out")).toBeVisible();
  });
});
