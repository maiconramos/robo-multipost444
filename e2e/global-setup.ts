/**
 * Global setup — runs once before all test suites.
 *
 * Seeds the test database with a user and workspace,
 * performs a UI signup to generate auth state, and saves
 * the storage state so individual tests can reuse it.
 */

import { test as setup, expect } from "@playwright/test";
import { cleanDatabase, getPrisma, disconnectPrisma } from "./fixtures/db";
import { signUpViaUI, saveAuthState } from "./fixtures/auth";
import { TEST_USER } from "./fixtures/test-data";
import path from "path";

const AUTH_STATE_PATH = path.join(__dirname, ".auth-state.json");

setup("global database seed & auth state", async ({ page, context }) => {
  // 1. Clean the database to start fresh
  try {
    await cleanDatabase();
  } catch (e) {
    console.warn("Database clean failed (may be first run):", e);
  }

  // 2. Sign up the primary test user via the UI
  //    This also triggers auto-creation of the default workspace.
  await signUpViaUI(page, TEST_USER);

  // 3. Verify we're on the dashboard
  await expect(page).toHaveURL(/\/dashboard/);

  // 4. Save the authenticated state for reuse
  await saveAuthState(context, AUTH_STATE_PATH);

  // 5. Disconnect Prisma
  await disconnectPrisma();
});

export { AUTH_STATE_PATH };
