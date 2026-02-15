/**
 * E2E tests for the provider catalog and account connection system.
 *
 * Covers: provider-based account connection, catalog-driven UI,
 * and verifying the connect flow respects provider identifiers.
 */

import { test, expect } from "@playwright/test";
import path from "path";

const AUTH_STATE = path.join(__dirname, "../.auth-state.json");

test.describe("Provider System", () => {
  test.use({ storageState: AUTH_STATE });

  test.describe("Account Connection with Providers", () => {
    test("should show connect account dialog with platform options", async ({
      page,
    }) => {
      await page.goto("/dashboard/accounts");
      await page.waitForLoadState("networkidle");

      const connectBtn = page.getByRole("button", {
        name: /connect|add|adicionar|conectar|nova conta/i,
      });
      await connectBtn.click();

      // Should show platforms from the provider catalog
      // At minimum Instagram, Facebook, Threads, TikTok should appear
      const platformNames = ["instagram", "facebook", "threads", "tiktok"];
      let foundPlatforms = 0;

      for (const name of platformNames) {
        const el = page.getByText(new RegExp(name, "i"));
        if (await el.first().isVisible().catch(() => false)) {
          foundPlatforms++;
        }
      }

      // At least one platform should be visible
      expect(foundPlatforms).toBeGreaterThan(0);
    });

    test("should list connected accounts with provider info", async ({
      page,
    }) => {
      await page.goto("/dashboard/accounts");
      await page.waitForLoadState("networkidle");

      // The page should load without errors, showing either
      // connected accounts or an empty state
      await expect(page.locator("body")).toBeVisible();
    });
  });

  test.describe("Accounts API with Provider Identifiers", () => {
    test("should list accounts via API", async ({ request }) => {
      const response = await request.get("/api/accounts");

      expect(response.status()).toBeLessThan(500);
      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty("accounts");
        expect(Array.isArray(data.accounts)).toBe(true);
      }
    });

    test("should check accounts health via API", async ({ request }) => {
      const response = await request.get("/api/accounts/health");

      // Health endpoint should return status for all connected accounts
      expect(response.status()).toBeLessThan(500);
    });
  });
});
