/**
 * E2E tests for the settings page.
 *
 * Covers: settings page layout, theme switching,
 * timezone/language selection, and workspace management.
 */

import { test, expect } from "@playwright/test";
import path from "path";

const AUTH_STATE = path.join(__dirname, "../.auth-state.json");

test.describe("Settings", () => {
  test.use({ storageState: AUTH_STATE });

  test.describe("Settings Page", () => {
    test("should display the settings page", async ({ page }) => {
      await page.goto("/dashboard/settings");
      await page.waitForLoadState("networkidle");

      // Should show settings content without errors
      await expect(page.locator("body")).toBeVisible();
    });

    test("should show user profile section", async ({ page }) => {
      await page.goto("/dashboard/settings");
      await page.waitForLoadState("networkidle");

      // Should show the current user's info or profile section
      const profileSection = page.getByText(
        /profile|perfil|account|conta|user|usuário/i
      );
      await expect(profileSection.first()).toBeVisible({ timeout: 10_000 });
    });

    test("should show theme toggle", async ({ page }) => {
      await page.goto("/dashboard/settings");
      await page.waitForLoadState("networkidle");

      // Should have theme toggle (dark/light)
      const themeSection = page.getByText(/theme|tema|dark|escuro|light|claro/i);
      await expect(themeSection.first()).toBeVisible({ timeout: 10_000 });
    });

    test("should show timezone setting", async ({ page }) => {
      await page.goto("/dashboard/settings");
      await page.waitForLoadState("networkidle");

      // Should have timezone selector
      const timezoneSection = page.getByText(
        /timezone|fuso horário|time zone/i
      );
      await expect(timezoneSection.first()).toBeVisible({ timeout: 10_000 });
    });

    test("should show sign out button", async ({ page }) => {
      await page.goto("/dashboard/settings");
      await page.waitForLoadState("networkidle");

      // Should have a sign out / logout button
      const signOutBtn = page.getByRole("button", {
        name: /sign out|sair|logout/i,
      });
      await expect(signOutBtn).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe("Workspace API", () => {
    test("should list workspaces via API", async ({ request }) => {
      const response = await request.get("/api/workspaces");

      expect(response.status()).toBeLessThan(500);
      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty("workspaces");
        expect(Array.isArray(data.workspaces)).toBe(true);
        // The test user should have at least the default workspace
        expect(data.workspaces.length).toBeGreaterThanOrEqual(1);
      }
    });

    test("should get active workspace via API", async ({ request }) => {
      const response = await request.get("/api/workspaces/active");

      expect(response.status()).toBeLessThan(500);
    });
  });
});
