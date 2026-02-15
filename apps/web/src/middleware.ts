import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { getBetterAuthSecret, isValidCronSecret } from "@/lib/secrets";

const PUBLIC_ROUTES = ["/", "/login", "/signup", "/no-access"];

const PUBLIC_PREFIXES = ["/api/auth", "/api/public", "/invite"];

const PROTECTED_API_PREFIXES = [
  "/api/posts",
  "/api/accounts",
  "/api/queues",
  "/api/profiles",
  "/api/media",
  "/api/workspaces",
  "/api/logs",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!process.env.BETTER_AUTH_SECRET) {
    // Injetamos o segredo derivado no processo para o better-auth enxergar
    process.env.BETTER_AUTH_SECRET = getBetterAuthSecret();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Allow public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next();
  }

  // Allow public prefixes
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Cron routes use header-based auth
  if (pathname.startsWith("/api/cron/")) {
    const authHeader = request.headers.get("authorization");
    const cronSecretHeader = request.headers.get("x-cron-secret");
    const vercelCronHeader = request.headers.get("x-vercel-cron");

    // Se for uma chamada legítima da Vercel Cron, permitimos (Vercel limpa esse header de requests externos)
    if (vercelCronHeader === "1") {
      return NextResponse.next();
    }

    const providedSecret = cronSecretHeader
      ? cronSecretHeader
      : authHeader?.startsWith("Bearer ")
        ? authHeader.substring(7)
        : authHeader;

    if (!isValidCronSecret(providedSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.next();
  }

  const isProtectedPage = pathname.startsWith("/dashboard");
  const isProtectedApi = PROTECTED_API_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    // API routes return 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Pages redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};
