import { defineConfig, devices } from "@playwright/test";

// E2E against a running WargaIn (default: production on PM2, port 4005).
//   npm run test:e2e                          # mobile + desktop
//   E2E_BASE_URL=http://localhost:4001 npm run test:e2e
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { outputFolder: "tests/report", open: "never" }]],
  outputDir: "tests/results",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:4005",
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1366, height: 860 } } },
  ],
});
