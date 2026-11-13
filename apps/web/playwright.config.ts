import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "./tests/e2e",
  // Outside the app: next dev watches the project and would hot-reload on every trace write.
  outputDir: join(tmpdir(), "krudex-e2e-results"),
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: `http://localhost:${port}`, trace: "retain-on-failure" },
  projects: [
    // Locally we drive the installed Chrome; CI installs Playwright's Chromium.
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], ...(process.env.CI ? {} : { channel: "chrome" }) },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], ...(process.env.CI ? {} : { channel: "chrome" }) },
    },
  ],
  webServer: {
    command: process.env.CI ? `pnpm start --port ${port}` : `pnpm dev --port ${port}`,
    url: `http://localhost:${port}/api/health`,
    reuseExistingServer: !process.env.CI,
    env: { NEXT_PUBLIC_ENABLE_PREVIEW: "true" },
  },
});
