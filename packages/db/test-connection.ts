/**
 * Quick test to verify Drizzle connects and can query the database.
 *
 * Usage:
 *   DATABASE_URL=... npx tsx test-connection.ts
 */
import { createDb } from "./index";
import { workspace, user } from "./schema";
import { count } from "drizzle-orm";

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  console.log("Connecting to database...");
  const db = createDb(databaseUrl);

  // Test 1: Count workspaces (proves connection + schema works)
  console.log("Test 1: Query workspaces");
  const workspaces = await db.select().from(workspace);
  console.log(`  Found ${workspaces.length} workspace(s)`);
  if (workspaces.length > 0) {
    console.log(`  First: "${workspaces[0].name}" (${workspaces[0].slug})`);
  }

  // Test 2: Count users
  console.log("Test 2: Query users");
  const users = await db.select().from(user);
  console.log(`  Found ${users.length} user(s)`);
  if (users.length > 0) {
    console.log(`  First: "${users[0].name}" (${users[0].email})`);
  }

  // Test 3: Count query (aggregate)
  console.log("Test 3: Count query");
  const [workspaceCount] = await db.select({ total: count() }).from(workspace);
  console.log(`  Workspace count: ${workspaceCount.total}`);

  console.log("\nAll tests passed! Drizzle is working with Neon Postgres.");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
