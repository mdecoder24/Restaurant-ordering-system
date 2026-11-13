import { expect, test } from "@playwright/test";
import { admin, createOwner, login } from "./fixtures";

test.describe("tables and QR codes (T08, D-05)", () => {
  test.skip(({ isMobile }) => isMobile, "Table setup is a desktop/tablet task");

  test("owner adds tables, prints QR codes and regenerates one", async ({ page }) => {
    const owner = await createOwner("tables");
    await login(page, owner, "/app/tables");

    await page.getByRole("button", { name: "Add tables" }).first().click();
    await page.getByLabel("How many").fill("4");
    await page.getByRole("button", { name: "Add 4 tables" }).click();
    await expect(page.getByRole("button", { name: /^Table T4 .*Free/ })).toBeVisible();

    const pdf = await page.request.get("/api/tables/qr.pdf");
    expect(pdf.headers()["content-type"]).toBe("application/pdf");
    expect((await pdf.body()).subarray(0, 4).toString()).toBe("%PDF");

    const { data: before } = await admin().from("tables").select("qr_token").eq("outlet_id", owner.outletId).eq("label", "T1").single();
    await page.getByRole("button", { name: /^Table T1 .*Free/ }).click();
    await expect(page.getByRole("img", { name: "QR code for table T1" })).toBeVisible();
    await page.getByRole("button", { name: "New QR code" }).click();
    await page.getByRole("button", { name: "Make new code" }).click();
    await expect(page.getByText("New code ready")).toBeVisible();
    const { data: after } = await admin().from("tables").select("qr_token").eq("outlet_id", owner.outletId).eq("label", "T1").single();
    expect(after!.qr_token).not.toBe(before!.qr_token);
  });

  test("signed-out visitors cannot download QR codes", async ({ request }) => {
    const res = await request.get("/api/tables/qr.pdf");
    expect(res.status()).toBe(401);
  });
});
