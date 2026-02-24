import { defineConfig, devices } from "@playwright/test";

const PORT = Number.parseInt(process.env.PLAYWRIGHT_PORT ?? "3200", 10);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: {
    timeout: 20_000,
  },
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    headless: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `ADMIN_APP_ORIGIN=http://127.0.0.1:${PORT} ADMIN_APP_HOSTS=127.0.0.1,localhost,admin.localhost NEXT_PUBLIC_DEV_ADMIN_BYPASS=true NEXT_DIST_DIR=.next-e2e pnpm exec next dev --webpack -p ${PORT}`,
    url: BASE_URL,
    timeout: 240_000,
    reuseExistingServer: false,
    cwd: __dirname,
  },
});
