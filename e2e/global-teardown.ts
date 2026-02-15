/**
 * Global teardown — runs once after all test suites complete.
 *
 * Cleans the test database and removes temporary auth state files.
 */

import { test as teardown } from "@playwright/test";
import { cleanDatabase, disconnectPrisma } from "./fixtures/db";
import fs from "fs";
import path from "path";

const AUTH_STATE_PATH = path.join(__dirname, ".auth-state.json");

teardown("global database cleanup", async () => {
  // 1. Clean all test data from the database
  try {
    await cleanDatabase();
  } catch (e) {
    console.warn("Teardown database clean failed:", e);
  }

  // 2. Disconnect Prisma
  await disconnectPrisma();

  // 3. Remove auth state file
  try {
    if (fs.existsSync(AUTH_STATE_PATH)) {
      fs.unlinkSync(AUTH_STATE_PATH);
    }
  } catch {
    // Ignore cleanup errors
  }
});
