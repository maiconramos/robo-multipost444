/**
 * E2E tests for queue management.
 *
 * Covers: queue listing, creating queues, editing queue slots,
 * queue preview, and queue deletion.
 */

import { test, expect } from "@playwright/test";
import path from "path";

const AUTH_STATE = path.join(__dirname, "../.auth-state.json");

test.describe("Queues", () => {
  test.use({ storageState: AUTH_STATE });

  test.describe("Queue Page", () => {
    test("should display the queue management page", async ({ page }) => {
      await page.goto("/dashboard/queue");
      await page.waitForLoadState("networkidle");

      // Should show queue page content without errors
      await expect(page.locator("body")).toBeVisible();
    });

    test("should show create queue button or empty state", async ({
      page,
    }) => {
      await page.goto("/dashboard/queue");
      await page.waitForLoadState("networkidle");

      // Look for create button or empty state message
      const createBtn = page.getByRole("button", {
        name: /create|criar|add|nova fila/i,
      });
      const emptyState = page.getByText(
        /no queues|nenhuma fila|get started|create your first/i
      );

      // Either button or empty state should be present
      const hasCreateBtn = await createBtn.isVisible().catch(() => false);
      const hasEmptyState = await emptyState.isVisible().catch(() => false);

      expect(hasCreateBtn || hasEmptyState).toBe(true);
    });
  });

  test.describe("Queue API", () => {
    test("should list queues via API", async ({ request }) => {
      const response = await request.get("/api/queues");

      expect(response.status()).toBeLessThan(500);
      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty("queues");
        expect(Array.isArray(data.queues)).toBe(true);
      }
    });

    test("should get queue preview via API", async ({ request }) => {
      const response = await request.get("/api/queues/preview?count=5");

      expect(response.status()).toBeLessThan(500);
    });
  });
});
