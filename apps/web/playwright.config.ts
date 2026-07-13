import { defineConfig, devices } from "@playwright/test";

const PORT = Number.parseInt(process.env.PLAYWRIGHT_PORT ?? "3200", 10);
const PUBLIC_PORT = Number.parseInt(process.env.PLAYWRIGHT_PUBLIC_PORT ?? "3201", 10);
const LIVE_MODE = process.env.E2E_CAST_LIVE === "1";
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;
const PUBLIC_BASE_URL = process.env.PLAYWRIGHT_PUBLIC_BASE_URL ?? `http://127.0.0.1:${PUBLIC_PORT}`;
const STORAGE_STATE = process.env.PLAYWRIGHT_STORAGE_STATE;
const E2E_FIREBASE_ENV = {
  NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "placeholder-api-key-for-e2e",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "placeholder.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-e2e",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "demo-e2e.firebasestorage.app",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "1234567890",
  NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:1234567890:web:e2e",
};

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
    storageState: STORAGE_STATE || undefined,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    headless: true,
  },
  projects: [
    {
      name: "admin-chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: "homepage-public-smoke.spec.ts",
    },
    {
      name: "public-chromium",
      use: { ...devices["Desktop Chrome"], baseURL: PUBLIC_BASE_URL },
      testMatch: "homepage-public-smoke.spec.ts",
    },
  ],
  webServer: LIVE_MODE
    ? undefined
    : [
        {
          command: `ADMIN_APP_ORIGIN=http://localhost:${PORT} ADMIN_APP_HOSTS=localhost,127.0.0.1,admin.localhost NEXT_PUBLIC_DEV_ADMIN_BYPASS=true NEXT_DIST_DIR=.next-e2e pnpm exec next dev --webpack -p ${PORT}`,
          url: BASE_URL,
          timeout: 240_000,
          reuseExistingServer: false,
          cwd: __dirname,
          env: E2E_FIREBASE_ENV,
        },
        {
          command: `ADMIN_APP_ORIGIN=http://admin.localhost:${PORT} ADMIN_APP_HOSTS=admin.localhost,localhost,127.0.0.1 NEXT_PUBLIC_DEV_ADMIN_BYPASS=false NEXT_DIST_DIR=.next-e2e-public pnpm exec next dev --webpack -p ${PUBLIC_PORT}`,
          url: PUBLIC_BASE_URL,
          timeout: 240_000,
          reuseExistingServer: false,
          cwd: __dirname,
          env: E2E_FIREBASE_ENV,
        },
      ],
});
