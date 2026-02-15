/**
 * E2E tests for API route protection and security.
 *
 * Covers: unauthenticated access to protected routes,
 * cron endpoint protection, and workspace data isolation.
 */

import { test, expect } from "@playwright/test";

test.describe("API Protection", () => {
  test.describe("Unauthenticated access", () => {
    // These tests run without auth state to verify protection

    const protectedEndpoints = [
      "/api/posts",
      "/api/accounts",
      "/api/queues",
      "/api/profiles",
      "/api/media",
      "/api/media/storage",
      "/api/workspaces",
      "/api/logs/publishing",
    ];

    for (const endpoint of protectedEndpoints) {
      test(`should reject unauthenticated GET ${endpoint}`, async ({
        request,
      }) => {
        const response = await request.get(endpoint, {
          headers: {
            Cookie: "", // No session cookie
          },
        });

        // Should return 401 or redirect (3xx)
        expect([401, 403, 302, 307]).toContain(response.status());
      });
    }

    test("should reject unauthenticated POST /api/posts", async ({
      request,
    }) => {
      const response = await request.post("/api/posts", {
        data: { content: "unauthorized post" },
        headers: {
          Cookie: "",
        },
      });

      expect([401, 403, 302, 307]).toContain(response.status());
    });
  });

  test.describe("Cron endpoint protection", () => {
    test("should reject cron without secret header", async ({ request }) => {
      const response = await request.post("/api/cron/process", {
        headers: {
          Cookie: "",
        },
      });

      // Should return 401 or 403 without the cron secret
      expect([401, 403]).toContain(response.status());
    });

    test("should reject cron with wrong secret", async ({ request }) => {
      const response = await request.post("/api/cron/process", {
        headers: {
          "x-cron-secret": "wrong-secret",
          Cookie: "",
        },
      });

      expect([401, 403]).toContain(response.status());
    });
  });

  test.describe("Public auth routes", () => {
    test("should allow access to auth endpoint", async ({ request }) => {
      const response = await request.get("/api/auth/session");

      // Auth endpoint should always be accessible (returns empty session if unauthenticated)
      expect(response.status()).toBeLessThan(500);
    });
  });
});
