# Robo-Multipost Documentation

Welcome to the living documentation for **Robo-Multipost**, a Next.js-based multi-platform social media scheduler. It integrates with services like Late API for posting to platforms including TikTok, YouTube, Pinterest, Instagram, Facebook, LinkedIn, Google Business, Telegram, and Threads. Key features include account management, post composition with media uploads, queue scheduling, calendar views, and health checks.

This docs folder serves as the central knowledge base. Use the [core guides](#core-guides) for deep dives, or explore [architecture](#architecture), [public API](#public-api), and [symbol index](#symbol-index) for technical details.

## Core Guides

These guides provide structured overviews and workflows:

- **[Project Overview](./project-overview.md)**: Roadmap, features, user stories, and deployment notes.
- **[Architecture Notes](./architecture.md)**: Service boundaries, data flow diagrams, and dependency graphs.
- **[Development Workflow](./development-workflow.md)**: Branching strategy, PR processes, and local setup.
- **[Testing Strategy](./testing-strategy.md)**: Unit/integration tests, CI gates, and coverage goals.
- **[Glossary & Domain Concepts](./glossary.md)**: Terms like `QueueSlot`, `PlatformPost`, `AccountHealth`.
- **[Data Flow & Integrations](./data-flow.md)**: API routes, Late client interactions, and event queues.
- **[Security & Compliance Notes](./security.md)**: API key validation, OAuth flows, and data handling.
- **[Providers Guide](./providers.md)**: Late/BYO provider architecture, OAuth flow, and platform extension.
- **[Credentials Guide](./credentials.md)**: Account credential kinds, encryption, masking, and reveal-once behavior.
- **[Post Model Guide](./post-model.md)**: `Post.socialAccountId` flow and compatibility with `PlatformPost`.
- **[Storage Guide](./storage.md)**: Media upload providers, limits, and environment configuration.
- **[AI Integration Guide](./ai.md)**: OpenRouter provider flow, credential setup, and `/api/ai/*` routes.
- **[i18n Standard](./i18n.md)**: PT-BR default, EN fallback, and required translation workflow for frontend features.
- **[Design System Guide](./design-system.md)**: CSS token source of truth, semantic status tones, and UI governance rules.
- **[Tooling & Productivity Guide](./tooling.md)**: ESLint, Tailwind, Docker, and npm scripts.

## Architecture

Robo-Multipost follows a Next.js App Router structure with React Server Components, hooks for state/logic, and a central Late API integration.

```
src/
├── app/                 # Pages and layouts (dashboard, callback, compose)
│   ├── api/             # API routes (e.g., /validate-key)
│   ├── dashboard/       # Core UI: compose, queue, calendar, accounts, settings
│   ├── callback/        # OAuth flows for platform connections
│   └── layout.tsx       # Root layout with Providers
├── components/          # UI primitives (ui/), shared (logo, platform-icon), domain-specific (posts/, accounts/)
├── hooks/               # Custom hooks for data fetching/mutations (use-accounts, use-posts, use-queue, use-media)
├── lib/                 # Utilities (utils.ts, timezones.ts, avatar.ts) and Late API client/types
└── stores/              # Zustand stores (auth-store.ts, app-store.ts)
```

- **Utils**: `src/lib/*`, `src/components/shared/*` (e.g., `cn`, timezones, avatars).
- **Controllers/API**: `src/lib/late-api/*`, `src/app/api/*` (e.g., key validation).
- **Components**: Domain-organized under `src/app/dashboard/*` and `src/components/*`.

Data flows from hooks → stores → UI components, with SWR/TanStack Query-like patterns in hooks for caching/mutations.

## Public API

Exported symbols for reuse across the app. Key hooks manage CRUD for posts, queues, accounts, and media.

### Top Exports
| Symbol | Location | Purpose |
|--------|----------|---------|
| `useAccounts` | `src/hooks/use-accounts.ts` | Fetch/manage connected accounts |
| `usePosts` | `src/hooks/use-posts.ts` | List/create/update posts with filters |
| `useQueueSlots` | `src/hooks/use-queue.ts` | Schedule management (`QueueSlot`, `QueueSchedule`) |
| `createLateClient` | `src/lib/late-api/client.ts` | Initialize Late API client |
| `cn` | `src/lib/utils.ts` | Tailwind class merger |
| `getTimezoneOptions` | `src/lib/timezones.ts` | Timezone handling utilities |
| `PlatformIcon` | `src/components/shared/platform-icon.tsx` | Icons for platforms (TikTok, Instagram, etc.) |
| `Providers` | `src/components/providers.tsx` | Auth/UI providers wrapper |

**Example Usage (Queue Hook)**:
```tsx
import { useQueueSlots } from '@/hooks/use-queue';

function QueueView() {
  const { slots, isLoading } = useQueueSlots({ profileId: 'abc123' });
  return (
    <div>
      {slots.map(slot => (
        <div key={slot.id}>{formatQueueSlot(slot)}</div>
      ))}
    </div>
  );
}
```

**Example Usage (Post Creation)**:
```tsx
import { useCreatePost } from '@/hooks/use-posts';
import type { CreatePostInput } from '@/hooks/use-posts';

const createPostInput: CreatePostInput = {
  content: 'Hello world!',
  socialAccountId: 'acc1',
  mediaItems: [{ url: 'https://...', type: 'image' }],
  publishNow: true,
};

function ComposeForm() {
  const createPost = useCreatePost();
  const handleSubmit = () => createPost.mutate(createPostInput);
}
```

## Symbol Index

### Interfaces & Types
- **Accounts**: `Account`, `AccountHealth` (`src/hooks/use-accounts.ts`)
- **Posts**: `PostFilters`, `MediaItem`, `PlatformPost`, `CreatePostInput`, `UpdatePostInput` (`src/hooks/use-posts.ts`)
- **Queue**: `QueueSlot`, `QueueSchedule` (`src/hooks/use-queue.ts`)
- **Media**: `UploadedMedia` (`src/hooks/use-media.ts`)
- **Platforms**: `Platform`, `PlatformSpecificData` (e.g., `InstagramPlatformData`, `TikTokPlatformData`) (`src/lib/late-api/types.ts`)
- **Stores**: `AuthState`, `AppState`, `UsageStats` (`src/stores/*`)

### Key Functions & Hooks
- Timezones: `getUserTimezone`, `formatInTimezone`, `isValidTimezone`
- Media: `useUploadMedia`, `getMediaType`, `getMaxFileSize`
- Late: `useLateClient`, `getServerClient`
- UI: `PlatformBadge`, `Logo`, `RootLayout`

Full list exceeds 100 symbols; see codebase scans for details.

## Repository Snapshot

```
.
├── components.json
├── CONTRIBUTING.md
├── docker-compose.yml
├── Dockerfile
├── docs/                # 📖 This folder: auto-generated docs
├── eslint.config.mjs
├── LICENSE
├── next.config.ts
├── next-env.d.ts
├── package.json
├── postcss.config.mjs
├── public/
├── README.md            # Project root README
├── src/                 # App source
└── tsconfig.json
```

**Key Dependencies** (most imported):
- `src/app/dashboard/compose/page.tsx`
- `src/hooks/use-queue.ts`, `use-posts.ts`, `use-accounts.ts`

## Development Quickstart

1. **Clone & Install**: `git clone ... && npm i`
2. **Env Setup**: Copy `.env.example` → `.env.local`; configure `DATABASE_URL`, `ENCRYPTION_KEY`, Better Auth vars, and `CRON_SECRET`.
3. **Run**: `npm run dev` (localhost:3000)
4. **Configure Accounts**: `/dashboard/accounts` → choose platform + connection method + account credentials (stored encrypted in DB).
5. **Compose Post**: `/dashboard/compose` → Add media, schedule, queue.

**Scripts**:
- `npm run build` / `npm run start`
- `npm run lint` / `npm run type-check`

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) and [Development Workflow](./development-workflow.md). Focus on hooks for new features; extend `PlatformSpecificData` for custom platform logic.

For issues or PRs: Use labels `enhancement`, `bug`, `docs`. Tests required for core hooks.

---

*Docs auto-generated from codebase analysis. Last updated: [timestamp]. Regenerate via tooling.*
