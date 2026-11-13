import { expect, test } from "@playwright/test";
import { admin, createOwner, login, seedMenu, seedTable } from "./fixtures";
import { open } from "./helpers";

test.describe("platform admin (T20, A-01)", () => {
  test.skip(({ isMobile }) => isMobile, "Desktop only");

  test("suspending a tenant closes its QR codes; reactivating restores them", async ({ page, browser }) => {
    const operator = await createOwner("operator");
    const { data: user } = await admin().from("members").select("user_id").eq("tenant_id", operator.tenantId).single();
    await admin().from("platform_admins").insert({ user_id: user!.user_id! });

    const venue = await createOwner("venue");
    await seedMenu(venue);
    const table = await seedTable(venue, "T1");
    const { data: tenant } = await admin().from("tenants").select("name").eq("id", venue.tenantId).single();

    await login(page, operator, "/admin");
    const row = page.getByRole("row", { name: new RegExp(tenant!.name) });
    await row.getByRole("button", { name: "Suspend" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Suspend" }).click();
    await expect(row.getByText("Suspended")).toBeVisible();

    const guestCtx = await browser.newContext();
    const guest = await guestCtx.newPage();
    await open(guest, `/t/${table.qr_token}`);
    await expect(guest.getByText("Ordering is unavailable")).toBeVisible();

    await row.getByRole("button", { name: "Reactivate" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Reactivate" }).click();
    await expect(row.getByText("Active")).toBeVisible();
    await open(guest, `/t/${table.qr_token}`);
    await expect(guest.getByRole("heading", { name: "Mains" })).toBeVisible();
    await guestCtx.close();
  });

  test("tenant owners cannot open the platform admin", async ({ page }) => {
    const owner = await createOwner("notadmin");
    await login(page, owner, "/app");
    await page.goto("/admin");
    await expect(page.getByText(/could not be found/i)).toBeVisible();
  });
});
