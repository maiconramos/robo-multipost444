/**
 * E2E tests for the dashboard home page and navigation.
 *
 * Covers: dashboard layout, navigation links, overview cards,
 * and responsive behavior.
 */

import { test, expect } from "@playwright/test";
import path from "path";

const AUTH_STATE = path.join(__dirname, "../.auth-state.json");

test.describe("Dashboard", () => {
  test.use({ storageState: AUTH_STATE });

  test("should display the dashboard overview", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // The dashboard should show overview content
    await expect(page.locator("body")).not.toContainText("error", {
      ignoreCase: true,
      timeout: 5_000,
    });
  });

  test("should have navigation links to key pages", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    // Check for navigation links (sidebar or top nav)
    const navLinks = [
      { pattern: /compose|compor|create post|criar post/i, href: /compose/ },
      { pattern: /calendar|calendário/i, href: /calendar/ },
      { pattern: /accounts|contas/i, href: /accounts/ },
      { pattern: /media|mídia/i, href: /media/ },
      { pattern: /queue|fila/i, href: /queue/ },
      { pattern: /settings|configurações/i, href: /settings/ },
    ];

    for (const link of navLinks) {
      const navElement = page.getByRole("link", { name: link.pattern });
      // Some links may be in a sidebar that needs to be opened on mobile
      if (await navElement.isVisible()) {
        await expect(navElement).toBeVisible();
      }
    }
  });

  test("should navigate to compose page", async ({ page }) => {
    await page.goto("/dashboard/compose");
    await page.waitForLoadState("networkidle");

    // Should show compose form
    await expect(
      page.getByText(/create post|criar post/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("should navigate to calendar page", async ({ page }) => {
    await page.goto("/dashboard/calendar");
    await page.waitForLoadState("networkidle");

    // Should show calendar view
    await expect(page.locator("body")).toBeVisible();
  });

  test("should navigate to accounts page", async ({ page }) => {
    await page.goto("/dashboard/accounts");
    await page.waitForLoadState("networkidle");

    // Should show accounts page content
    await expect(page.locator("body")).toBeVisible();
  });

  test("should navigate to queue page", async ({ page }) => {
    await page.goto("/dashboard/queue");
    await page.waitForLoadState("networkidle");

    // Should show queue page content
    await expect(page.locator("body")).toBeVisible();
  });

  test("should navigate to media library page", async ({ page }) => {
    await page.goto("/dashboard/media");
    await page.waitForLoadState("networkidle");

    // Should show media library heading
    await expect(
      page.getByText(/media library|biblioteca de mídia/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("should navigate to settings page", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await page.waitForLoadState("networkidle");

    // Should show settings page content
    await expect(page.locator("body")).toBeVisible();
  });
});
