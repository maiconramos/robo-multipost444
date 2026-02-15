/**
 * Mock handlers for external integrations.
 *
 * Uses Playwright's route interception (`page.route()`) to mock
 * external API calls that would otherwise require real credentials:
 *
 * - Late SDK API calls → mocked responses
 * - Platform OAuth endpoints → mocked token exchanges
 * - Vercel Blob uploads → mocked storage responses
 * - Social media platform APIs → mocked publish responses
 */

import { type Page, type Route } from "@playwright/test";

/**
 * Install all external API mocks on a page.
 * Call this in `test.beforeEach` for tests that trigger external calls.
 */
export async function installMocks(page: Page): Promise<void> {
  await Promise.all([
    mockLateApi(page),
    mockVercelBlob(page),
    mockPlatformApis(page),
  ]);
}

/**
 * Mock Late SDK API calls.
 * The Late provider calls `https://api.getlate.dev/*`.
 */
async function mockLateApi(page: Page): Promise<void> {
  await page.route("**/api.getlate.dev/**", async (route: Route) => {
    const url = route.request().url();

    // POST /posts — publish a post
    if (url.includes("/posts") && route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: `late-post-${Date.now()}`,
          status: "published",
          publishedAt: new Date().toISOString(),
          platformPostUrl: "https://www.instagram.com/p/mock-post-id/",
        }),
      });
      return;
    }

    // GET /accounts — list connected accounts
    if (url.includes("/accounts") && route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          accounts: [
            {
              id: "late-acc-1",
              platform: "instagram",
              username: "mock_instagram",
              displayName: "Mock Instagram",
              status: "connected",
            },
          ],
        }),
      });
      return;
    }

    // GET /profiles — list profiles
    if (url.includes("/profiles") && route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          profiles: [
            {
              id: "late-profile-1",
              name: "Mock Profile",
              accounts: ["late-acc-1"],
            },
          ],
        }),
      });
      return;
    }

    // Default: 200 empty response
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });
}

/**
 * Mock Vercel Blob upload endpoint.
 */
async function mockVercelBlob(page: Page): Promise<void> {
  await page.route("**/blob.vercel-storage.com/**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        url: `https://mock-blob.vercel-storage.com/test-${Date.now()}.jpg`,
        pathname: `test-${Date.now()}.jpg`,
        contentType: "image/jpeg",
        contentDisposition: 'inline; filename="test.jpg"',
      }),
    });
  });
}

/**
 * Mock platform OAuth and API endpoints.
 * Covers Instagram, Facebook, Threads, TikTok token exchanges and publish calls.
 */
async function mockPlatformApis(page: Page): Promise<void> {
  // Instagram / Facebook Graph API
  await page.route("**/graph.facebook.com/**", async (route: Route) => {
    const url = route.request().url();

    // Token exchange
    if (url.includes("oauth/access_token")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "mock-fb-access-token",
          token_type: "bearer",
          expires_in: 5184000,
        }),
      });
      return;
    }

    // User info
    if (url.includes("/me")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "mock-fb-user-123",
          name: "Mock FB User",
          username: "mockfbuser",
        }),
      });
      return;
    }

    // Media publish (container creation + publish)
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: `mock-media-${Date.now()}`,
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [] }),
    });
  });

  // Instagram Graph API (api.instagram.com)
  await page.route("**/api.instagram.com/**", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "mock-ig-access-token",
        user_id: "mock-ig-user-123",
      }),
    });
  });

  // Threads API
  await page.route("**/graph.threads.net/**", async (route: Route) => {
    const url = route.request().url();

    if (url.includes("oauth/access_token")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          access_token: "mock-threads-token",
          token_type: "bearer",
          expires_in: 5184000,
        }),
      });
      return;
    }

    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: `mock-threads-${Date.now()}`,
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });

  // TikTok API
  await page.route("**/open.tiktokapis.com/**", async (route: Route) => {
    const url = route.request().url();

    if (url.includes("oauth/token")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            access_token: "mock-tiktok-token",
            refresh_token: "mock-tiktok-refresh",
            expires_in: 86400,
            open_id: "mock-tiktok-user",
          },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: {} }),
    });
  });
}

/**
 * Mock the cron endpoint to simulate scheduled post processing.
 * Useful for testing the publishing flow without real cron.
 */
export async function mockCronProcessing(page: Page): Promise<void> {
  await page.route("**/api/cron/process", async (route: Route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          processed: 1,
          results: [
            {
              postId: "mock-processed-post",
              status: "completed",
            },
          ],
        }),
      });
      return;
    }

    await route.continue();
  });
}
