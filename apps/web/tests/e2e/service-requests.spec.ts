import { devices, expect, test } from "@playwright/test";
import { createOwner, guestOrder, login, seedMenu, seedTable } from "./fixtures";
import { open } from "./helpers";

test.describe("service requests (T18, G-15)", () => {
  test.skip(({ isMobile }) => isMobile, "Phone + tablet together");

  test("a guest's call reaches the live board in realtime and staff acknowledge it", async ({ page, browser }) => {
    const owner = await createOwner("svc");
    const { items } = await seedMenu(owner);
    const table = await seedTable(owner, "T6");
    const phoneCtx = await browser.newContext({ ...devices["Pixel 7"] });
    const phone = await phoneCtx.newPage();
    const order = await guestOrder(phone.request, table.qr_token, items.find((i) => i.name === "Chicken Biryani")!.id);

    await login(page, owner, "/app/orders");
    const group = page.getByRole("region", { name: "Table T6" });
    await expect(group).toBeVisible();

    await open(phone, `/o/${order.order_id}`);
    await phone.getByRole("button", { name: "Call a waiter" }).click();
    await expect(phone.getByText("A waiter is on the way")).toBeVisible();
    await expect(group.getByText("Calling a waiter")).toBeVisible({ timeout: 3_000 });

    await group.getByRole("button", { name: "On my way" }).click();
    await expect(group.getByText("Calling a waiter")).toBeHidden();
    await phoneCtx.close();
  });
});
