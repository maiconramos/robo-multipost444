import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import { getBetterAuthSecret, getBaseUrl } from "@/lib/secrets";

function getTrustedOrigins(): string[] {
  const trusted = new Set<string>([
    "https://*.vercel.app",
    getBaseUrl(),
  ]);

  if (process.env.NEXT_PUBLIC_APP_URL) {
    trusted.add(process.env.NEXT_PUBLIC_APP_URL);
  }

  if (process.env.NODE_ENV !== "production") {
    trusted.add("http://localhost:3000");
    trusted.add("http://localhost:3001");
    trusted.add("http://127.0.0.1:3000");
    trusted.add("http://127.0.0.1:3001");
  }

  if (process.env.BETTER_AUTH_TRUSTED_ORIGINS) {
    process.env.BETTER_AUTH_TRUSTED_ORIGINS.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
      .forEach((origin) => trusted.add(origin));
  }

  return [...trusted];
}

export const auth = betterAuth({
  secret: getBetterAuthSecret(),
  baseURL: getBaseUrl(),
  trustedOrigins: getTrustedOrigins(),
  database: prismaAdapter(prisma, {
    provider: "postgresql",
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
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
