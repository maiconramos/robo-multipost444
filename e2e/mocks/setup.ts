/**
 * Mock setup utilities for isolating external dependencies.
 *
 * Provides higher-level helpers to configure test scenarios
 * that involve external service interactions.
 */

import { type Page } from "@playwright/test";
import { installMocks } from "./handlers";

/**
 * Set up a fully-mocked environment for a test page.
 * Installs all external API mocks and configures the page
 * to intercept any outbound requests to third-party services.
 */
export async function setupMockedEnvironment(page: Page): Promise<void> {
  await installMocks(page);

  // Block any unhandled external requests in test mode
  // to catch unexpected dependencies
  await page.route(
    (url) => {
      const hostname = new URL(url.toString()).hostname;
      const isLocal =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname.endsWith(".local");
      return !isLocal;
    },
    async (route) => {
      // Allow already-mocked routes to pass through
      // This handler only catches routes not already intercepted
      const url = route.request().url();
      console.warn(`[E2E Mock] Unhandled external request: ${url}`);
      await route.abort("blockedbyclient");
    }
  );
}

/**
 * Configure a page for testing the OAuth connection flow.
 * Mocks the OAuth redirect to simulate a successful authorization.
 */
export async function setupOAuthFlowMock(
  page: Page,
  platform: "instagram" | "facebook" | "threads" | "tiktok"
): Promise<void> {
  // Intercept the OAuth redirect and simulate a successful callback
  const oauthUrls: Record<string, string> = {
    instagram: "**/api.instagram.com/oauth/authorize**",
    facebook: "**/www.facebook.com/v*/dialog/oauth**",
    threads: "**/www.threads.net/oauth/authorize**",
    tiktok: "**/www.tiktok.com/v2/auth/authorize**",
  };

  const pattern = oauthUrls[platform];
  if (!pattern) return;

  await page.route(pattern, async (route) => {
    // Instead of going to the real OAuth page, redirect back to our callback
    const state = encodeURIComponent(
      JSON.stringify({ platform, workspaceId: "test" })
    );
    const callbackUrl = `http://localhost:3000/callback?code=mock-auth-code-${platform}&state=${state}`;

    await route.fulfill({
      status: 302,
      headers: {
        Location: callbackUrl,
      },
    });
  });
}

/**
 * Configure a page for testing media upload.
 * The new flow uses /api/media/upload-token for client-side uploads
 * to Vercel Blob, then registers the asset via POST /api/media.
 */
export async function setupMediaUploadMock(page: Page): Promise<void> {
  // Mock the upload token endpoint
  await page.route("**/api/media/upload-token", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          token: "mock-upload-token-e2e",
          pathname: `test-workspace/posts/test-${Date.now()}.jpg`,
          provider: "VERCEL_BLOB",
          multipartRecommended: false,
          maxSizeBytes: 10 * 1024 * 1024,
          expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        }),
      });
    } else {
      await route.continue();
    }
  });

  // Mock the storage status endpoint
  await page.route("**/api/media/storage", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          provider: "VERCEL_BLOB",
          planName: "Test Plan",
          quotaBytes: 1073741824,
          usedBytes: 10240,
          remainingBytes: 1073731584,
          usedPercent: 0.001,
          usageSource: "db",
          isQuotaFallback: true,
        }),
      });
    } else {
      await route.continue();
    }
  });
}
