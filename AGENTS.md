# AGENTS.md

Development guide for AI agents working on Robo MultiPost. For the full project context, architecture, and rules, see **[CLAUDE.md](./CLAUDE.md)**.

## Dev Environment

```bash
npm install              # Install dependencies
npm run dev              # Dev server (localhost:3000)
npm run build            # Production build
npm run lint             # ESLint check
npx tsc --noEmit         # Type check
npx prisma generate      # Regenerate Prisma client after schema changes
npx prisma db push       # Push schema changes to database
npx prisma migrate dev   # Create migration from schema changes
```

Store generated artifacts in `.context/` so reruns stay deterministic.

## Testing Instructions

- Run `npm run build` before opening a PR to verify no build errors.
- Run `npm run lint` to check for linting issues.
- Run `npx tsc --noEmit` for type checking.
- After Prisma schema changes, always run `npx prisma generate`.
- Verify no secrets/tokens appear in `.next/static/` client bundles.

## PR Instructions

- Follow Conventional Commits: `feat(scope):`, `fix(scope):`, `refactor(scope):`, etc.
- Cross-link new scaffolds in `docs/` and `.context/` so future agents can find them.
- Attach sample output when behavior changes.
- Verify built artifacts match source changes.

## Architecture Overview

Robo MultiPost is a **self-hosted multi-platform social media scheduler** built on:

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5**
- **Neon Postgres + Prisma** as source of truth
- **Neon Auth (Better Auth)** for multi-tenant authentication with workspaces
- **Provider system:** per-account connector routing (`SocialAccount.connectionMethod`) using `LateProvider` + `BYOProvider`
- **Vercel Cron** for scheduled post publishing
- **MediaStorage interface:** Vercel Blob / S3-compatible / URL-only

### Key Architectural Rules

1. **All data operations go through `/api/*` routes.** Hooks call `fetch()`, never Late SDK directly.
2. **Secrets never in frontend.** API keys and tokens are encrypted in DB (AES-256-GCM).
3. **Every DB query filters by `workspaceId`.** No cross-workspace data leaks.
4. **No code from `/research`** can be copied into the repo. Reference only.
5. **Frontend i18n is mandatory.** PT-BR is the default locale; EN is secondary and optional via user selection.
6. **No hardcoded UI/toast strings in new frontend code.** Use `useI18n()` with `t("...")` and register keys in `src/lib/i18n/messages/pt-BR.ts`.

## Repository Map

| Path | Purpose | When to Edit |
|------|---------|-------------|
| `CLAUDE.md` | Full project context for AI agents | When architecture, rules, or env vars change |
| `AGENTS.md` | Quick dev guide for AI agents | When dev workflow or commands change |
| `prisma/schema.prisma` | Database schema | When adding/modifying tables or fields |
| `src/app/api/` | Server-side API routes | When adding endpoints or changing data flow |
| `src/hooks/` | React Query hooks (call `/api/*`) | When changing how UI fetches data |
| `src/lib/providers/` | PostingProvider implementations | When adding platforms or changing publish logic |
| `src/lib/storage/` | MediaStorage implementations | When adding storage backends |
| `src/lib/auth/` | Auth config, session helpers, workspace logic | When changing auth or authorization |
| `src/lib/i18n/` | Locale store integration, translators, and message dictionaries | When adding/changing frontend text |
| `src/lib/encryption.ts` | AES-256-GCM encrypt/decrypt | When changing crypto approach |
| `src/middleware.ts` | Route protection via Neon Auth | When changing which routes are protected |
| `src/stores/` | Zustand stores (app-store only, no secrets) | When changing client-side state |
| `src/components/ui/` | shadcn/ui base components | When adding new UI primitives |
| `src/components/shared/` | Shared components (Logo, PlatformIcon) | When adding reusable components |
| `src/app/dashboard/` | Dashboard pages | When modifying user-facing screens |
| `docker-compose.yml` | Docker services (app + postgres) | When changing infrastructure |
| `Dockerfile` | Container build config | When changing build steps |
| `vercel.json` | Vercel config (cron jobs) | When changing cron schedule |
| `.context/docs/` | Project documentation | When documenting new features |
| `.context/agents/` | Agent playbooks | When adding specialized agent guides |
| `.context/skills/` | Skill definitions | When adding task-specific procedures |

## Multi-tenancy Model

- `Workspace` is the tenant boundary. All data is workspace-scoped.
- `WorkspaceMember` links users to workspaces with roles: OWNER, ADMIN, MEMBER.
- First user auto-creates "Default" workspace as OWNER.
- Users without membership see "no access" screen.
- `ENABLE_MULTI_WORKSPACE=false` by default.

## Provider System

```
PostingProvider (interface)
├── LateProvider  → Reads per-account `LATE_API_KEY` credential from DB → Late SDK (server-side)
└── BYOProvider   → Reads per-account BYO credentials from DB → Direct platform APIs
```

Selected per-account via `SocialAccount.connectionMethod` + `Credential` records linked to `socialAccountId`.

## AI Context References

- Full project context: `CLAUDE.md`
- Documentation index: `.context/docs/README.md`
- Architecture: `.context/docs/architecture.md`
- Data flow: `.context/docs/data-flow.md`
- Security: `.context/docs/security.md`
- Auth: `.context/docs/auth.md`
- Workspaces: `.context/docs/workspaces.md`
- Storage: `.context/docs/storage.md`
- i18n standard: `.context/docs/i18n.md`
- Agent playbooks: `.context/agents/README.md`
- Contributor guide: `CONTRIBUTING.md`
