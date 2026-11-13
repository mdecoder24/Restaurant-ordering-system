import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createOwner, guestOrder, login, seedMenu, seedTable, staffTransition } from "./fixtures";

/** Release gate: no serious or critical axe violations on the main screens (NFR a11y). */
test.describe("accessibility sweep (T21)", () => {
  test.skip(({ isMobile }) => isMobile, "Dashboard screens on desktop; guest screens are covered in guest.spec");

  test("dashboard, kitchen and guest screens", async ({ page, request }) => {
    test.setTimeout(120_000);
    const owner = await createOwner("a11y");
    const { items } = await seedMenu(owner);
    const table = await seedTable(owner, "T1");
    const order = await guestOrder(request, table.qr_token, items.find((i) => i.name === "Chicken Biryani")!.id);
    await staffTransition(order.order_id, "placed", "accepted");
    await login(page, owner, "/app");

    for (const path of ["/app", "/app/orders", "/app/tables", "/app/menu", "/app/payments", "/app/analytics", "/app/staff", "/app/settings", `/kds/${owner.outletId}`, `/t/${table.qr_token}`, "/login", "/"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(900); // entrance animations settle before contrast checks
      const r = await new AxeBuilder({ page }).analyze();
      const bad = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => `${path}: ${v.id} → ${v.nodes[0]?.html.slice(0, 120)}`);
      expect(bad, path).toEqual([]);
    }
  });
});
