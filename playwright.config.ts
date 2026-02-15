import { defineConfig, devices } from "@playwright/test";
import path from "path";

/**
 * Playwright E2E test configuration for Robo MultiPost.
 *
 * Uses `.env.test` for test-specific environment variables.
 * The Next.js dev server is started automatically via `webServer`.
 */
export default defineConfig({
  testDir: path.join(__dirname, "e2e/tests"),
  outputDir: path.join(__dirname, "e2e/test-results"),

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Parallel execution */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter */
  reporter: process.env.CI
    ? [["html", { outputFolder: "e2e/playwright-report" }], ["github"]]
    : [["html", { outputFolder: "e2e/playwright-report", open: "never" }]],

  /* Shared settings for all projects */
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  /* Test projects */
  projects: [
    /* Setup project — seeds the database and creates auth state */
    {
      name: "setup",
      testMatch: /global-setup\.ts/,
      teardown: "teardown",
    },
    {
      name: "teardown",
      testMatch: /global-teardown\.ts/,
    },

    /* Desktop Chrome */
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },

    /* Mobile Chrome (responsive) */
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
      dependencies: ["setup"],
    },
  ],

  /* Start the Next.js dev server before tests */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NODE_ENV: "test",
    },
  },

  /* Global timeout per test */
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
});
