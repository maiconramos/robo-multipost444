# CLAUDE.md

Project context and rules for AI agents working on Robo MultiPost.

## Project Identity

- **Name:** Robô MultiPost
- **Purpose:** Self-hosted multi-platform social media scheduler
- **Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui
- **Database:** Neon Postgres + Prisma ORM
- **Auth:** Neon Auth (Better Auth) with workspace-based multi-tenancy
- **Providers:** per-account connector routing (`SocialAccount.connectionMethod`) with Late + BYO
- **Storage:** Vercel Blob (default) / S3-compatible / URL-only
- **Scheduling:** Vercel Cron calling `POST /api/cron/process`

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server at localhost:3000
npm run build        # Production build
npm run lint         # ESLint check
npx tsc --noEmit     # Type check
npx prisma generate  # Generate Prisma client after schema changes
npx prisma db push   # Push schema to database
npx prisma migrate dev # Create and apply migration
```

## Architecture

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # Server-side API routes
│   │   ├── auth/[...all]/  # Neon Auth handler
│   │   ├── cron/process/   # Vercel Cron worker endpoint
│   │   ├── posts/          # Posts CRUD
│   │   ├── accounts/       # Accounts + OAuth initiation
│   │   ├── queues/         # Queue management
│   │   ├── profiles/       # Profile management
│   │   ├── media/upload/   # Media upload endpoint
│   │   └── workspaces/     # Workspace + invite management
│   ├── dashboard/          # Protected pages (compose, calendar, queue, accounts, settings)
│   ├── callback/           # OAuth callback handler
│   ├── setup/              # First-time setup wizard
│   └── no-access/          # No workspace membership screen
├── components/
│   ├── ui/                 # shadcn/ui base components
│   ├── shared/             # Logo, PlatformIcon, ErrorBoundary
│   ├── accounts/           # Account cards
│   └── posts/              # Post cards, status badges
├── hooks/                  # React Query hooks (call /api/* routes, NOT Late SDK)
├── lib/
│   ├── prisma.ts           # Prisma client singleton
│   ├── encryption.ts       # AES-256-GCM encrypt/decrypt for tokens
│   ├── queue-scheduler.ts  # Next-slot computation for queues
│   ├── auth/               # Neon Auth config, getCurrentUser, workspace helpers
│   ├── providers/          # PostingProvider interface + implementations
│   │   ├── types.ts        # PostingProvider interface
│   │   ├── index.ts        # getProvider(workspaceId) factory
│   │   ├── late-provider.ts
│   │   └── byo-provider.ts
│   ├── storage/            # MediaStorage interface + implementations
│   │   ├── types.ts
│   │   ├── vercel-blob.ts
│   │   ├── s3-storage.ts
│   │   └── url-only.ts
│   └── platforms/types.ts  # Platform definitions, colors, constraints
├── stores/                 # Zustand (app-store only; no secrets in localStorage)
└── middleware.ts            # Auth middleware for /dashboard/* routes
prisma/
└── schema.prisma           # Database schema
```

## Critical Rules

### Security
1. **No secrets in frontend.** API keys, OAuth tokens, and any credentials are stored encrypted in the database. Never in localStorage, never in client bundles.
2. **All data operations go through `/api/*` routes.** Hooks call `fetch('/api/...')`, not Late SDK directly. Late SDK is server-side only inside `LateProvider`.
3. **Encrypt all tokens** using `src/lib/encryption.ts` (AES-256-GCM with `ENCRYPTION_KEY` env var) before storing in DB.
4. **Workspace-scoped queries.** Every database query MUST filter by `workspaceId`. Never leak data across workspaces.
5. **Cron endpoint protected** by `CRON_SECRET` header validation.

### Code Quality
1. **No code from `/research` directory** can be copied into the repo. Use as behavioral reference only.
2. **Small incremental changes.** Each PR should be a single logical change with passing build.
3. **Follow existing patterns.** Use React Query hooks for data fetching. Use Zod for validation. Use shadcn/ui for components.
4. **Path alias:** `@/*` maps to `src/*`.
5. **Conventional Commits:** `feat(scope):`, `fix(scope):`, `refactor(scope):`, etc.

### Frontend i18n (Mandatory)
1. **Default locale is `pt-BR`; secondary locale is `en`.** New UI must preserve this behavior.
2. **Never hardcode user-facing text in frontend features.** Use `useI18n()` and `t("...")` for labels, descriptions, empty states, aria labels, and all toast notifications.
3. **Every new translation key must be added to `src/lib/i18n/messages/pt-BR.ts`.** English fallback comes from key text (or explicit mapping in `en.ts` when needed).
4. **When API errors are shown in UI, pass messages through `t(...)`** (or `translateErrorMessage`) so PT-BR remains primary.
5. **Date/time strings shown in UI should be locale-aware** using helpers in `src/lib/i18n/date.ts`.

### Multi-tenancy
1. **First user** who signs up and has no workspace: auto-create "Default" workspace, assign as OWNER.
2. **Users without workspace membership** see "no access" screen, never crash.
3. **`ENABLE_MULTI_WORKSPACE=false`** by default. Only OWNER can create workspaces when enabled.
4. **OWNER/ADMIN** can invite by email. Invitee becomes MEMBER.

## Data Flow

```
User Browser
  → Next.js Middleware (session check)
  → Dashboard Page (React Server/Client Components)
  → React Query Hook (e.g., usePosts)
  → fetch('/api/posts', ...)
  → API Route (validates session → gets workspace → gets provider)
  → Provider (LateProvider or BYOProvider)
  → Late API / Platform APIs
  → Response → React Query cache → UI
```

## Provider System

The `PostingProvider` interface abstracts posting operations:
- **LateProvider:** Decrypts Late API key from `Credential` table, delegates to Late SDK server-side.
- **BYOProvider:** Reads encrypted platform tokens from `SocialAccount`, calls platform APIs directly.

Provider is selected per-account using `Post.socialAccountId` -> `SocialAccount.connectionMethod` and account-linked `Credential` rows.

## Key Database Models

- `Workspace` - Tenant boundary for all data
- `WorkspaceMember` - User-to-workspace mapping with roles (OWNER/ADMIN/MEMBER)
- `Credential` - Encrypted provider credentials (Late API key, storage config)
- `SocialAccount` - Connected social accounts (with encrypted BYO tokens)
- `Post` → `PlatformPost` → `MediaItem` - Post hierarchy
- `Queue` → `QueueSlot` - Scheduling configuration
- `CronJob` - Tracks scheduled post execution
- `Invite` - Workspace invitations

## Environment Variables

```
# Required
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
ENCRYPTION_KEY=<64-char-hex>
CRON_SECRET=<random-string>

# Storage (pick one)
STORAGE_PROVIDER=VERCEL_BLOB  # or S3_COMPAT or URL_ONLY
BLOB_READ_WRITE_TOKEN=...     # for Vercel Blob

# S3 (if STORAGE_PROVIDER=S3_COMPAT)
S3_ENDPOINT=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_BUCKET=

# Feature flags
ENABLE_MULTI_WORKSPACE=false
```

## Supported Platforms (Current Focus)

instagram, facebook, threads, tiktok

## Context References

- Documentation: `.context/docs/README.md`
- Architecture: `.context/docs/architecture.md`
- Data flow: `.context/docs/data-flow.md`
- Security: `.context/docs/security.md`
- Provider model: `.context/docs/providers.md`
- Credentials model: `.context/docs/credentials.md`
- Post model: `.context/docs/post-model.md`
- Auth docs: `.context/docs/auth.md`
- Workspace docs: `.context/docs/workspaces.md`
- Storage docs: `.context/docs/storage.md`
- i18n docs: `.context/docs/i18n.md`
- Agent playbooks: `.context/agents/README.md`
- Skills: `.context/skills/README.md`

## Testing Checklist

After any change:
1. `npx prisma generate` - schema compiles
2. `npx tsc --noEmit` - type check
3. `npm run lint` - lint
4. `npm run build` - production build
5. Verify no tokens/secrets in `.next/static/` bundle
