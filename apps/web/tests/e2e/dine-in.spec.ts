import { devices, expect, test } from "@playwright/test";
import { admin, createOwner, login, seedMenu, seedTable, staffTransition } from "./fixtures";
import { open } from "./helpers";

test.describe("full dine-in run-through (T14, T16)", () => {
  test.skip(({ isMobile }) => isMobile, "Runs one phone and one staff tablet together");

  test("order, accept, cook, serve, settle in cash, close table with GST invoice", async ({ page, browser }) => {
    const owner = await createOwner("dinein");
    await seedMenu(owner);
    const table = await seedTable(owner, "T9");

    // Staff tablet on the live board.
    await login(page, owner, "/app/orders");
    await expect(page.getByText("No orders yet")).toBeVisible();

    // Guest phone.
    const phone = await browser.newContext({ ...devices["Pixel 7"] });
    const guest = await phone.newPage();
    await open(guest, `/t/${table.qr_token}`);
    await guest.getByRole("button", { name: "Add Chicken Biryani" }).click();
    await guest.getByRole("button", { name: /View cart/ }).click();
    await guest.getByRole("dialog").getByRole("button", { name: /Place order/ }).click();
    await expect(guest.getByRole("heading", { name: "Order sent" })).toBeVisible();
    const orderId = guest.url().split("/o/")[1]!;

    // Appears on the board in realtime; staff accepts.
    const group = page.getByRole("region", { name: "Table T9" });
    await expect(group).toBeVisible({ timeout: 5_000 });
    await group.getByRole("button", { name: "Accept" }).click();
    await expect(guest.getByRole("heading", { name: "Confirmed" })).toBeVisible({ timeout: 3_000 });

    // Kitchen cooks.
    await staffTransition(orderId, "accepted", "preparing");
    await staffTransition(orderId, "preparing", "ready");
    await expect(guest.getByRole("heading", { name: "On its way" })).toBeVisible({ timeout: 3_000 });

    await group.getByRole("button", { name: "Mark served" }).click();
    await expect(guest.getByRole("heading", { name: "Served. Enjoy!" })).toBeVisible({ timeout: 3_000 });

    // Guest asks for the bill; the table shows it.
    await guest.goto(`/t/${table.qr_token}/orders`);

    // Settle in cash and close from the tables screen.
    await page.goto("/app/tables");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /^Table T9, Occupied/ }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByText("₹294").last()).toBeVisible();
    await sheet.getByRole("button", { name: "Record payment" }).click();
    await expect(page.getByText("₹294 recorded")).toBeVisible();
    await page.getByRole("dialog").getByRole("button", { name: "Close table" }).click();
    await expect(page.getByText("Table T9 closed")).toBeVisible();

    const { data: inv } = await admin().from("invoices").select("invoice_no, totals").eq("outlet_id", owner.outletId).single();
    expect(inv!.invoice_no).toMatch(/^\d{4}-\d{2}\/\d{6}$/);
    expect((inv!.totals as { total: number }).total).toBe(29400);
    const { data: t } = await admin().from("tables").select("status").eq("id", table.id).single();
    expect(t!.status).toBe("free");
    await phone.close();
  });
});
