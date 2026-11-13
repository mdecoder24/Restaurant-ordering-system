import { devices, expect, test } from "@playwright/test";
import { admin, createOwner, login, seedMenu } from "./fixtures";
import { open } from "./helpers";

test.describe("canteen run-through (T17)", () => {
  test.skip(({ isMobile }) => isMobile, "Runs phone, counter and display together");

  test("token, prepaid hold, ready on the pickup display, handover closes the session", async ({ page, browser }) => {
    const owner = await createOwner("canteen", "canteen");
    await seedMenu(owner);
    await admin().from("outlets").update({ payment_options: { online: true, cash: true, prepaid_only: true } }).eq("id", owner.outletId);
    const { data: outlet } = await admin().from("outlets").select("counter_qr_token").eq("id", owner.outletId).single();

    // Pickup display on a TV.
    const tvCtx = await browser.newContext();
    const tv = await tvCtx.newPage();
    await open(tv, `/display/${owner.outletId}`);
    await expect(tv.getByRole("heading", { name: "Ready to collect" })).toBeVisible();

    // Student orders from the counter QR.
    const phoneCtx = await browser.newContext({ ...devices["Pixel 7"] });
    const phone = await phoneCtx.newPage();
    await open(phone, `/t/${outlet!.counter_qr_token}`);
    await expect(phone.getByText("Pickup")).toBeVisible();
    await phone.getByRole("button", { name: "Add Chicken Biryani" }).click();
    await phone.getByRole("button", { name: /View cart/ }).click();
    await phone.getByRole("dialog").getByRole("button", { name: /Place order/ }).click();
    await expect(phone.getByRole("region", { name: "Your token" })).toBeVisible();
    const token = (await phone.getByRole("region", { name: "Your token" }).locator("p").nth(1).textContent())!.trim();
    const orderId = phone.url().split("/o/")[1]!;

    // Prepaid: held at "placed" until paid, then released to the kitchen.
    expect((await admin().from("orders").select("status").eq("id", orderId).single()).data!.status).toBe("placed");
    await phone.getByRole("link", { name: "Pay and view orders" }).click();
    await phone.waitForLoadState("networkidle");
    await phone.getByRole("button", { name: /Pay ₹294/ }).click();
    await phone.getByRole("button", { name: "Simulate successful payment" }).click();
    await expect(phone.getByText("Paid in full. Thank you!")).toBeVisible();
    await expect.poll(async () => (await admin().from("orders").select("status").eq("id", orderId).single()).data!.status).toBe("accepted");
    await expect(tv.getByRole("region", { name: "Preparing" }).getByText(token, { exact: true })).toBeVisible({ timeout: 5_000 });

    // Counter (owner) starts, marks ready, hands over.
    await login(page, owner, "/app/canteen");
    const panel = page.getByRole("region", { name: `Token ${token}` });
    await expect(panel.getByText("Paid", { exact: true })).toBeVisible();
    await panel.getByRole("button", { name: "Start" }).click();
    await panel.getByRole("button", { name: "Mark ready" }).click();
    await expect(tv.getByRole("region", { name: "Ready to collect" }).getByText(token, { exact: true })).toBeVisible({ timeout: 5_000 });
    await phone.goto(`/o/${orderId}`);
    await expect(phone.getByRole("heading", { name: `Ready. Collect with token ${token}` })).toBeVisible();

    await panel.getByRole("button", { name: "Handed over" }).click();
    await expect(page.getByText(`Token ${token} handed over`)).toBeVisible();
    await expect.poll(async () => (await admin().from("table_sessions").select("status").eq("outlet_id", owner.outletId).single()).data!.status).toBe("closed");
    await expect(tv.getByText(token, { exact: true })).toHaveCount(0, { timeout: 5_000 });
    await phoneCtx.close();
    await tvCtx.close();
  });
});
