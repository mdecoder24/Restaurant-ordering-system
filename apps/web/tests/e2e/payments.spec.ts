import { createHmac } from "node:crypto";
import { expect, test } from "@playwright/test";
import { admin, createOwner, login, seedMenu, seedTable } from "./fixtures";
import { open } from "./helpers";

test.describe("payments (T15)", () => {
  test("guest pays online, a duplicate webhook is harmless, owner refunds", async ({ page, browser, request }) => {
    test.skip(test.info().project.name === "mobile", "One run is enough");
    const owner = await createOwner("pay");
    await seedMenu(owner);
    const table = await seedTable(owner, "T2");

    const phone = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true });
    const guest = await phone.newPage();
    await open(guest, `/t/${table.qr_token}`);
    await guest.getByRole("button", { name: "Add Chicken Biryani" }).click();
    await guest.getByRole("button", { name: /View cart/ }).click();
    await guest.getByRole("dialog").getByRole("button", { name: /Place order/ }).click();
    await expect(guest.getByRole("heading", { name: "Order sent" })).toBeVisible();

    await guest.getByRole("link", { name: "View bill and pay" }).click();
    await expect(guest.getByText("Amount due")).toBeVisible();
    await guest.waitForLoadState("networkidle");
    await guest.getByRole("button", { name: /Pay ₹294/ }).click();
    await guest.getByRole("button", { name: "Simulate successful payment" }).click();
    await expect(guest.getByText("Paid in full. Thank you!")).toBeVisible({ timeout: 5_000 });

    const { data: pay } = await admin().from("payments").select("id, status, amount, provider_order_id, provider_payment_id").eq("outlet_id", owner.outletId).single();
    expect(pay).toMatchObject({ status: "captured", amount: 29400 });

    // A replayed, correctly signed webhook for the same event changes nothing (AGENTS rule 4).
    const body = JSON.stringify({
      event: "payment.captured",
      payload: { payment: { entity: { id: pay!.provider_payment_id, order_id: pay!.provider_order_id, amount: 29400, method: "upi" } } },
    });
    const sig = createHmac("sha256", "local-only-webhook-secret-for-tests").update(body).digest("hex");
    const send = () => request.post("/api/webhooks/razorpay", { data: body, headers: { "content-type": "application/json", "x-razorpay-signature": sig, "x-razorpay-event-id": `evt_${pay!.id}` } });
    expect((await (await send()).json()).data.result).toBe("applied");
    expect((await (await send()).json()).data.result).toBe("duplicate");
    const bad = await request.post("/api/webhooks/razorpay", { data: body, headers: { "content-type": "application/json", "x-razorpay-signature": "0".repeat(64) } });
    expect(bad.status()).toBe(401);
    const { count } = await admin().from("payments").select("id", { count: "exact", head: true }).eq("outlet_id", owner.outletId);
    expect(count).toBe(1);

    // Receipt downloads as a PDF.
    const receipt = await guest.request.get(`/api/guest/receipt?outlet=${owner.outletId}`);
    expect(receipt.headers()["content-type"]).toBe("application/pdf");

    // Owner refunds part of it.
    await login(page, owner, "/app/payments");
    await page.getByRole("button", { name: "Refund" }).click();
    await page.getByLabel("Amount (₹)").fill("100");
    await page.getByLabel("Reason").fill("Late delivery");
    await page.getByRole("dialog").getByRole("button", { name: "Refund" }).click();
    await expect(page.getByText("Refund of ₹100 started")).toBeVisible();
    const { data: after } = await admin().from("payments").select("refunded_amount").eq("id", pay!.id).single();
    expect(after!.refunded_amount).toBe(10000);
    await phone.close();
  });
});
