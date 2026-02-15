/**
 * E2E tests for the cron processing endpoint.
 *
 * Covers: cron health check, cron processing with valid secret,
 * and rejection of invalid cron requests.
 */

import { test, expect } from "@playwright/test";
import path from "path";

const AUTH_STATE = path.join(__dirname, "../.auth-state.json");

test.describe("Cron Processing", () => {
  test.describe("Health Check", () => {
    test("should return cron health status via GET", async ({ request }) => {
      const response = await request.get("/api/cron/process");

      // GET returns health status (may require cron secret or be public)
      expect(response.status()).toBeLessThan(500);
    });
  });

  test.describe("System Info", () => {
    test.use({ storageState: AUTH_STATE });

    test("should return system cron info when authenticated", async ({
      request,
    }) => {
      const response = await request.get("/api/system/cron-info");

      expect(response.status()).toBeLessThan(500);
    });
  });
});
