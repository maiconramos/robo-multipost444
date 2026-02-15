/**
 * @robo/db — Database package
 *
 * Provides Drizzle ORM instance with support for:
 * - Neon Postgres (default, via neon-http driver)
 * - Cloudflare D1 (future, via d1 driver)
 *
 * Usage:
 *   import { createDb } from "@robo/db";
 *   const db = createDb(env.DATABASE_URL);
 *
 *   // Or with schema for type-safe queries:
 *   import * as schema from "@robo/db/schema";
 */
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type Database = ReturnType<typeof createDb>;

/**
 * Create a Drizzle instance connected to Neon Postgres.
 *
 * Uses Drizzle's built-in neon-http driver which handles the
 * @neondatabase/serverless client creation internally.
 *
 * @param connectionString - DATABASE_URL from environment
 * @returns Drizzle ORM instance with full schema and relations
 */
export function createDb(connectionString: string) {
  return drizzle(connectionString, { schema });
}

// Re-export schema for type-safe queries
export * from "./schema";
export { createId } from "./utils";
