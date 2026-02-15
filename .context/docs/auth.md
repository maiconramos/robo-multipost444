# Authentication - Neon Auth (Better Auth)

## Overview

Robo MultiPost uses [Better Auth](https://www.better-auth.com/) for authentication, configured with the Prisma adapter for PostgreSQL (Neon).

## Architecture

```
Browser → Middleware (session cookie check)
       → Better Auth API (/api/auth/*)
       → Session cookie (httpOnly, secure)
       → Database (user, session, account, verification tables)
```

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/auth/index.ts` | Better Auth config with Prisma adapter |
| `src/lib/auth/client.ts` | Client-side auth helpers: `signIn`, `signUp`, `signOut`, `useSession` |
| `src/lib/auth/get-current-user.ts` | Server-side helpers: `getCurrentUser`, `getAuthenticatedUser`, `getWorkspaceUser` |
| `src/lib/auth/workspace.ts` | Workspace logic: `ensureWorkspace`, `getWorkspaceForUser`, `hasWorkspaceRole` |
| `src/app/api/auth/[...all]/route.ts` | Better Auth catch-all route handler |
| `src/middleware.ts` | Route protection (session cookie check) |

## Auth Flow

### Sign Up
1. User visits `/signup`
2. Fills in name, email, password
3. `signUp.email()` from auth client → POST to `/api/auth/sign-up/email`
4. Better Auth creates `user` + `account` + `session` rows
5. Session cookie set → redirect to `/dashboard`
6. Dashboard detects no workspace → `ensureWorkspace()` auto-creates "Default" workspace

### Sign In
1. User visits `/login`
2. Fills in email, password
3. `signIn.email()` from auth client → POST to `/api/auth/sign-in/email`
4. Session cookie set → redirect to `/dashboard`

### Sign Out
1. `signOut()` from auth client → POST to `/api/auth/sign-out`
2. Session destroyed → redirect to `/`

## Session Management

- Sessions are cookie-based (httpOnly, secure in production)
- Cookie cache enabled (5 min) for performance
- `nextCookies()` plugin enables server-side cookie access

### Server-Side Session Access

```typescript
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const session = await auth.api.getSession({ headers: await headers() });
```

### Client-Side Session Access

```typescript
import { useSession } from "@/lib/auth/client";

const { data: session, isPending } = useSession();
```

## Middleware

The middleware at `src/middleware.ts` protects routes:

- **Public routes**: `/`, `/login`, `/signup`, `/no-access`, `/api/auth/*`, `/api/cron/*`, `/invite/*`
- **Protected routes**: `/dashboard/*`, `/api/posts/*`, `/api/accounts/*`, etc.
- **Behavior**: Redirects pages to `/login`, returns 401 for API routes

## Environment Variables

```env
BETTER_AUTH_SECRET=<random-32+chars>    # Required
BETTER_AUTH_URL=http://localhost:3000    # Required
```

## Adding OAuth Providers

To add Google/GitHub OAuth, update `src/lib/auth/index.ts`:

```typescript
export const auth = betterAuth({
  // ... existing config
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
});
```

Then add social login buttons to the login/signup pages.
