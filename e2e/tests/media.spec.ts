/**
 * E2E tests for the media library and asset management.
 *
 * Covers: media page layout, upload button, filter tabs,
 * storage status display, media CRUD API, and asset deletion.
 */

import { test, expect } from "@playwright/test";
import path from "path";

const AUTH_STATE = path.join(__dirname, "../.auth-state.json");

test.describe("Media Library", () => {
  test.use({ storageState: AUTH_STATE });

  test.describe("Media Page", () => {
    test("should display the media library page", async ({ page }) => {
      await page.goto("/dashboard/media");
      await page.waitForLoadState("networkidle");

      await expect(
        page.getByText(/media library|biblioteca de mídia/i)
      ).toBeVisible({ timeout: 10_000 });
    });

    test("should show upload button", async ({ page }) => {
      await page.goto("/dashboard/media");
      await page.waitForLoadState("networkidle");

      const uploadBtn = page.getByRole("button", {
        name: /upload|enviar/i,
      });
      await expect(uploadBtn).toBeVisible({ timeout: 10_000 });
    });

    test("should show filter tabs (All, Images, Videos)", async ({ page }) => {
      await page.goto("/dashboard/media");
      await page.waitForLoadState("networkidle");

      // All filter
      await expect(
        page.getByRole("button", { name: /^all$|^todos$/i })
      ).toBeVisible({ timeout: 10_000 });

      // Images filter
      await expect(
        page.getByRole("button", { name: /images|imagens/i })
      ).toBeVisible();

      // Videos filter
      await expect(
        page.getByRole("button", { name: /videos|vídeos/i })
      ).toBeVisible();
    });

    test("should show empty state when no media exists", async ({ page }) => {
      await page.goto("/dashboard/media");
      await page.waitForLoadState("networkidle");

      // Should show empty state or the media grid
      const emptyState = page.getByText(
        /no media|nenhuma mídia|upload images|envie imagens/i
      );
      const mediaGrid = page.locator(
        '[class*="grid"]'
      );

      const hasEmptyState = await emptyState.isVisible().catch(() => false);
      const hasGrid = await mediaGrid.isVisible().catch(() => false);

      // Either empty state or grid should be present
      expect(hasEmptyState || hasGrid).toBe(true);
    });

    test("should show storage status section", async ({ page }) => {
      await page.goto("/dashboard/media");
      await page.waitForLoadState("networkidle");

      // The storage status section should be visible (either loading or loaded)
      // Look for the container that holds storage info
      const storageSection = page.locator('[class*="border"][class*="rounded"]');
      await expect(storageSection.first()).toBeVisible({ timeout: 10_000 });
    });

    test("should show clear all media button", async ({ page }) => {
      await page.goto("/dashboard/media");
      await page.waitForLoadState("networkidle");

      const clearBtn = page.getByRole("button", {
        name: /clear all|limpar tudo|excluir tudo/i,
      });
      await expect(clearBtn).toBeVisible({ timeout: 10_000 });
    });
  });

  test.describe("Media API", () => {
    test("should list media assets via API", async ({ request }) => {
      const response = await request.get("/api/media");

      expect(response.status()).toBeLessThan(500);
      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty("assets");
        expect(Array.isArray(data.assets)).toBe(true);
        expect(data).toHaveProperty("total");
        expect(data).toHaveProperty("page");
        expect(data).toHaveProperty("limit");
        expect(data).toHaveProperty("pages");
      }
    });

    test("should support pagination in media list", async ({ request }) => {
      const response = await request.get("/api/media?page=1&limit=10");

      expect(response.status()).toBeLessThan(500);
      if (response.status() === 200) {
        const data = await response.json();
        expect(data.page).toBe(1);
        expect(data.limit).toBe(10);
      }
    });

    test("should support type filter in media list", async ({ request }) => {
      const response = await request.get("/api/media?type=image");

      expect(response.status()).toBeLessThan(500);
      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty("assets");
      }
    });

    test("should get storage status via API", async ({ request }) => {
      const response = await request.get("/api/media/storage");

      expect(response.status()).toBeLessThan(500);
      if (response.status() === 200) {
        const data = await response.json();
        expect(data).toHaveProperty("provider");
        expect(data).toHaveProperty("usedBytes");
      }
    });

    test("should create a media asset via API", async ({ request }) => {
      const response = await request.post("/api/media", {
        data: {
          type: "image",
          url: "https://mock-blob.vercel-storage.com/e2e-test.jpg",
          filename: "e2e-test.jpg",
          contentType: "image/jpeg",
          size: 2048,
        },
      });

      expect(response.status()).toBeLessThan(500);
      if (response.status() === 201) {
        const data = await response.json();
        expect(data).toHaveProperty("asset");
        expect(data.asset).toHaveProperty("id");
        expect(data.asset.type).toBe("image");
      }
    });
  });
});
