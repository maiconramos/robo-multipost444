/**
 * @robo/auth — Better Auth configuration for Cloudflare Worker
 *
 * Uses Drizzle adapter for database access (Neon Postgres).
 * Shared auth config used by the Hono Worker.
 *
 * Usage:
 *   import { createAuth } from "@robo/auth";
 *   const auth = createAuth(db, { secret, baseUrl, trustedOrigins });
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { Database } from "@robo/db";

export interface AuthOptions {
  /** Better Auth secret key */
  secret: string;
  /** Base URL for the application (e.g., https://app.example.com) */
  baseUrl: string;
  /** Trusted origins for CORS/cookies */
  trustedOrigins?: string[];
}

/**
 * Create a Better Auth instance configured with Drizzle adapter.
 *
 * @param db - Drizzle database instance from @robo/db
 * @param options - Auth configuration options
 * @returns Better Auth instance
 */
export function createAuth(db: Database, options: AuthOptions) {
  const trustedOrigins = new Set<string>([
    options.baseUrl,
    ...(options.trustedOrigins || []),
  ]);

  // Add dev origins in non-production
  if (process.env.NODE_ENV !== "production") {
    trustedOrigins.add("http://localhost:3000");
    trustedOrigins.add("http://localhost:3001");
    trustedOrigins.add("http://localhost:8787");
    trustedOrigins.add("http://127.0.0.1:3000");
    trustedOrigins.add("http://127.0.0.1:8787");
  }

  return betterAuth({
    secret: options.secret,
    baseURL: options.baseUrl,
    trustedOrigins: [...trustedOrigins],
    database: drizzleAdapter(db, {
      provider: "pg",
    }),
    emailAndPassword: {
      enabled: true,
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minutes
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
export type Session = Auth extends { $Infer: { Session: infer S } } ? S : never;
