import { expect, test } from "@playwright/test";
import { admin, createOwner, login } from "./fixtures";
import { open } from "./helpers";

test.describe("staff and settings (D-08, D-09)", () => {
  test.skip(({ isMobile }) => isMobile, "Desktop admin task");

  test("owner adds a PIN waiter who signs in on a shared phone; deactivating blocks them", async ({ page, browser }) => {
    const owner = await createOwner("staff");
    await login(page, owner, "/app/staff");
    await page.getByRole("button", { name: "Add staff" }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByLabel("Name").fill("Ravi Kumar");
    await sheet.getByLabel("PIN").fill("2468");
    await sheet.getByRole("button", { name: "Add staff" }).click();
    await expect(page.getByText("Ravi Kumar can now sign in with their PIN")).toBeVisible();
    await expect(page.getByText("PIN sign-in", { exact: true })).toBeVisible();

    const device = await browser.newContext();
    const phone = await device.newPage();
    await open(phone, `/pin/${owner.outletId}`);
    for (const d of "2468") await phone.getByRole("button", { name: d, exact: true }).click();
    await phone.getByRole("button", { name: "Sign in" }).click();
    await expect(phone).toHaveURL(/\/app\/orders$/);
    // Waiters cannot open owner screens (Flow §13).
    await phone.goto("/app/settings");
    await expect(phone).toHaveURL(/\/app\/orders$/);

    await page.getByRole("button", { name: "Edit Ravi Kumar" }).click();
    await page.getByRole("dialog").getByRole("switch").click();
    await page.getByRole("dialog").getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Inactive")).toBeVisible();
    await phone.goto("/app/orders");
    await expect(phone).toHaveURL(/\/(login|onboarding)/);
    await device.close();
  });

  test("owner turns on auto-accept and a service charge", async ({ page }) => {
    const owner = await createOwner("settings");
    await login(page, owner, "/app/settings");
    await page.getByRole("switch", { name: /Auto-accept orders/ }).click();
    await page.getByLabel("Service charge (%)").fill("5");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByText("Settings saved")).toBeVisible();
    const { data } = await admin().from("outlets").select("auto_accept, service_charge_bps").eq("id", owner.outletId).single();
    expect(data).toEqual({ auto_accept: true, service_charge_bps: 500 });
  });
});
