import { defineConfig } from "@playwright/test";

/**
 * Browser tests for the app. Run with `npm run test:e2e`.
 *
 * They use the Chrome already installed on the machine and the dev server
 * (started automatically unless one is already running on port 3000).
 * Logic with many cases (graph building, layouts, export rendering) is
 * covered by the Jest unit tests instead; these check that the pieces work
 * together in a real browser.
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  timeout: 30_000,
  expect: { timeout: 7_000 },
  use: {
    baseURL: "http://localhost:3000",
    channel: "chrome",
    viewport: { width: 1400, height: 800 },
    permissions: ["clipboard-read", "clipboard-write"],
    trace: "retain-on-failure",
    launchOptions: {
      // Software WebGL so the 3D view renders in headless mode.
      args: [
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
        "--ignore-gpu-blocklist",
      ],
    },
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
    // Paid features (image export) are tested without an account.
  },
});
