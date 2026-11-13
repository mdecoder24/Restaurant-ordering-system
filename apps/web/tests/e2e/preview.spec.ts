import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("design system preview", () => {
  for (const theme of ["Light", "Dark"] as const) {
    test(`${theme} theme has no serious or critical axe violations`, async ({ page }) => {
      await page.goto("/preview");
      await page.getByRole("radio", { name: theme }).click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", theme.toLowerCase());
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const blocking = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(blocking.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }

  test("sheet traps focus, closes on Escape and restores focus to its trigger", async ({ page }) => {
    await page.goto("/preview");
    const trigger = page.getByRole("button", { name: "Open item sheet" });
    await trigger.click();
    const sheet = page.getByRole("dialog", { name: "Paneer Tikka" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Close" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("page never scrolls horizontally", async ({ page }) => {
    await page.goto("/preview");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
