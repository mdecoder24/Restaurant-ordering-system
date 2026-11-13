import type { Page } from "@playwright/test";

/** Navigate and wait until the client has hydrated, so form actions run through React. */
export async function open(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}
