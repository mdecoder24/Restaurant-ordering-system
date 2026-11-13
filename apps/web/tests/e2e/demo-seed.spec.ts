import { expect, test } from "@playwright/test";
import { admin } from "./fixtures";
import { open } from "./helpers";

const DINE_IN = "e1000000-0000-4000-8000-000000000001";

test.describe("demo seed (supabase/seed.sql)", () => {
  test.skip(({ isMobile }) => isMobile, "Desktop smoke");

  test("demo owner logs in to a 30-item menu; kitchen PIN opens the KDS", async ({ page, browser }) => {
    const { count } = await admin().from("menu_items").select("id", { count: "exact", head: true }).eq("outlet_id", DINE_IN);
    test.skip(count !== 30, "Seed not loaded (run supabase db reset)");

    await open(page, "/login?next=/app/menu");
    await page.getByLabel("Email").fill("owner@demo.krudex.test");
    await page.getByLabel("Password").fill("krudex-demo-2026");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/app\/menu$/);
    await expect(page.getByRole("navigation", { name: "Categories" }).getByText("Starters")).toBeVisible();

    const kitchen = await (await browser.newContext()).newPage();
    await open(kitchen, `/kds/${DINE_IN}`);
    for (const d of "1234") await kitchen.getByRole("button", { name: d, exact: true }).click();
    await kitchen.getByRole("button", { name: "Sign in" }).click();
    await expect(kitchen.getByRole("heading", { name: /Indiranagar · Kitchen/ })).toBeVisible();
  });
});
