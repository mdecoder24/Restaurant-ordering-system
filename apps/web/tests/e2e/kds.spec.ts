import { expect, test } from "@playwright/test";
import { admin, createOwner, createPinStaff, guestOrder, seedMenu, seedTable, staffTransition } from "./fixtures";
import { open } from "./helpers";

test.describe("kitchen screen (T13)", () => {
  test.skip(({ isMobile }) => isMobile, "KDS runs on tablets and TVs");

  test("cook signs in with a PIN, starts and readies a ticket, survives a network drop", async ({ page, context, request }) => {
    const owner = await createOwner("kds");
    const { items } = await seedMenu(owner);
    const table = await seedTable(owner, "T3");
    await createPinStaff(owner, "kitchen", "4321");
    const dosa = items.find((i) => i.name === "Chicken Biryani")!;

    await open(page, `/kds/${owner.outletId}`);
    await expect(page).toHaveURL(/\/pin\//);
    for (const d of "4321") await page.getByRole("button", { name: d, exact: true }).click();
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(new RegExp(`/kds/${owner.outletId}$`));
    await expect(page.getByText("No active orders")).toBeVisible();
    await page.waitForLoadState("networkidle");

    const order = await guestOrder(request, table.qr_token, dosa.id, 2);
    await staffTransition(order.order_id, "placed", "accepted");
    const ticket = page.getByRole("article", { name: `Order ${order.order_no}, table T3` });
    await expect(ticket).toBeVisible({ timeout: 3_000 });
    await expect(ticket.getByText("2 × Chicken Biryani")).toBeVisible();

    // Start, undo, start again; the change is sent after the 5 s undo window.
    await ticket.getByRole("button", { name: "Start" }).click();
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(ticket.getByRole("button", { name: "Start" })).toBeVisible();
    await ticket.getByRole("button", { name: "Start" }).click();
    await expect(ticket.getByRole("button", { name: "Mark ready" })).toBeVisible();
    await expect.poll(async () => (await admin().from("orders").select("status").eq("id", order.order_id).single()).data?.status, { timeout: 8_000 }).toBe("preparing");

    // Network drop: banner shows; an order placed meanwhile appears after reconnect (K-06).
    await context.setOffline(true);
    await expect(page.getByText(/Reconnecting|offline/i).first()).toBeVisible({ timeout: 5_000 });
    const second = await guestOrder(request, table.qr_token, dosa.id, 1);
    await staffTransition(second.order_id, "placed", "accepted");
    await context.setOffline(false);
    await expect(page.getByRole("article", { name: `Order ${second.order_no}, table T3` })).toBeVisible({ timeout: 10_000 });
  });
});
