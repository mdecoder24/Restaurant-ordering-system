import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { open } from "./helpers";

test.describe("staff auth and onboarding (T05)", () => {
  test("owner signs up, onboards and lands on an empty dashboard", async ({ page }, info) => {
    const stamp = `${Date.now()}-${info.project.name}`;
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login\?next=%2Fapp/);

    await open(page, "/signup");
    await page.getByLabel("Email").fill(`owner-${stamp}@example.com`);
    await page.getByLabel("Password").fill("correct-horse-battery");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/onboarding/);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(900); // let entrance animations settle before measuring contrast
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);

    await page.getByLabel("Business name").fill(`Spice Route ${stamp}`);
    await page.getByLabel("Outlet name").fill("MG Road");
    await page.getByLabel("Your name").fill("Asha Rao");
    await page.getByRole("button", { name: "Create my outlet" }).click();

    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole("heading", { name: "Hello, Asha" })).toBeVisible();
    await expect(page.getByText("Get ready for service")).toBeVisible();
    await expect(page.getByText("Orders today")).toBeVisible();
  });

  test("wrong password shows an inline error", async ({ page }) => {
    await open(page, "/login");
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByText("Email or password is incorrect.")).toBeVisible();
  });
});
