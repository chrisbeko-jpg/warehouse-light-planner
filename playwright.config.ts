import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3014",
    trace: "on-first-retry",
    viewport: { width: 1440, height: 900 },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run build && npx next start -p 3014",
        url: "http://127.0.0.1:3014/home",
        reuseExistingServer: false,
        timeout: 180000,
        env: {
          ...process.env,
          INTERNAL_ADMIN_TOKEN: "playwright-test-token",
          NEXT_PUBLIC_SITE_MODE: "ledpaneel",
        },
      },
});
