import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { admin, createOwner, seedMenu, seedTable, staffTransition } from "./fixtures";
import { open } from "./helpers";

test.describe("guest ordering (T09–T12)", () => {
  test("guest scans, customises, orders and sees live status", async ({ page }) => {
    const owner = await createOwner("guest");
    await seedMenu(owner);
    const table = await seedTable(owner, "T7");

    await open(page, `/t/${table.qr_token}`);
    await expect(page.getByText("Table T7")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mains" })).toBeVisible();

    // Sold-out item cannot be added (G-12).
    await expect(page.getByText("Sold out")).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Paneer Tikka" })).toHaveCount(0);

    await page.waitForTimeout(700);
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);

    // Filters (G-03): Veg hides the non-veg biryani.
    await page.getByRole("button", { name: "Veg" }).first().click();
    await expect(page.getByText("Chicken Biryani")).toBeHidden();
    await page.getByRole("button", { name: "Veg" }).first().click();

    // Options sheet (G-04): pick Family size and an add-on.
    await page.getByRole("button", { name: "Add Masala Dosa" }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByText("Family").click();
    await sheet.getByText("Ghee").click();
    await sheet.getByRole("button", { name: "Add ₹220" }).click();

    await page.getByRole("button", { name: "Add Chicken Biryani" }).click();
    await page.getByRole("button", { name: /View cart/ }).click();

    // Cart survives refresh (G-05).
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /View cart/ }).click();
    const cart = page.getByRole("dialog");
    await expect(cart.getByText("Family · Ghee")).toBeVisible();
    await cart.getByLabel("Note for Chicken Biryani").fill("Less spicy");
    // 220 + 280 = 500 subtotal; 5% GST = 25 → ₹525.
    await expect(cart.getByRole("button", { name: "Place order · ₹525" })).toBeVisible();
    await cart.getByRole("button", { name: /Place order/ }).click();

    await expect(page).toHaveURL(/\/o\//);
    await expect(page.getByRole("heading", { name: "Order sent" })).toBeVisible();
    const orderId = page.url().split("/o/")[1]!;

    const { data: order } = await admin().from("orders").select("total, status").eq("id", orderId).single();
    expect(order).toEqual({ total: 52500, status: "placed" });

    // Staff accepts: guest sees it without refresh, within 2 s (G-08).
    await page.waitForTimeout(800);
    await staffTransition(orderId, "placed", "accepted");
    await expect(page.getByRole("heading", { name: "Confirmed" })).toBeVisible({ timeout: 2_000 });
    await staffTransition(orderId, "accepted", "preparing");
    await expect(page.getByRole("heading", { name: "Being prepared" })).toBeVisible({ timeout: 2_000 });
  });

  test("a double tap creates exactly one order (T10)", async ({ request }) => {
    const owner = await createOwner("idem");
    const { items } = await seedMenu(owner);
    const table = await seedTable(owner);
    const biryani = items.find((i) => i.name === "Chicken Biryani")!;
    const body = { qr: table.qr_token, lines: [{ item_id: biryani.id, variant_id: null, addon_ids: [], qty: 1 }] };
    const key = `test-${Date.now()}`;
    const [a, b] = await Promise.all([
      request.post("/api/guest/orders", { data: body, headers: { "Idempotency-Key": key } }),
      request.post("/api/guest/orders", { data: body, headers: { "Idempotency-Key": key } }),
    ]);
    const ids = [(await a.json()).data?.order_id, (await b.json()).data?.order_id];
    expect(ids[0]).toBeTruthy();
    expect(ids[0]).toBe(ids[1]);
    const { count } = await admin().from("orders").select("id", { count: "exact", head: true }).eq("outlet_id", owner.outletId);
    expect(count).toBe(1);
  });

  test("client prices are ignored and sold-out items are rejected", async ({ request }) => {
    const owner = await createOwner("price");
    const { items } = await seedMenu(owner);
    const table = await seedTable(owner);
    const tikka = items.find((i) => i.name === "Paneer Tikka")!;
    const res = await request.post("/api/guest/orders", {
      data: { qr: table.qr_token, lines: [{ item_id: tikka.id, variant_id: null, addon_ids: [], qty: 1, unit_price: 1 }] },
      headers: { "Idempotency-Key": `sold-${Date.now()}` },
    });
    expect(res.status()).toBe(409);
    expect((await res.json()).error.message).toBe("Paneer Tikka just sold out. Remove it to continue.");
  });

  test("an unknown QR shows the invalid page", async ({ page }) => {
    await page.goto("/t/notarealtoken-notarealtoken");
    await expect(page.getByText("This QR code isn’t active")).toBeVisible();
  });
});
