## Architecture Notes

The Robo-Multipost system is a monolithic Next.js application designed for scheduling and managing social media posts across multiple platforms. It assembles client-side React components, server-side API routes, and custom React hooks for data management, leveraging the App Router for routing and server components. The design prioritizes simplicity and rapid development for a single-developer project, using Zustand-like stores (e.g., `src/stores/auth-store.ts`, `src/stores/app-store.ts`) for global state and TanStack Query-inspired hooks for optimistic updates and caching. This structure emerged from the need to integrate with the Late API for cross-platform posting, minimizing boilerplate while supporting features like queue management, account health checks, and media uploads. The current design favors colocation of logic in hooks over traditional services to reduce indirection, enabling seamless server-client hydration in Next.js.

## System Architecture Overview

Robo-Multipost is a **monolithic web application** deployed as a single Next.js instance, typically on Vercel or similar edge platforms for serverless scaling. It follows a full-stack topology with:

- **Client-side rendering** for interactive dashboards (e.g., compose, queue, calendar).
- **Server-side rendering** for initial loads and API routes.
- **Static export potential** for non-auth pages, though dynamic auth and API calls prevent full static generation.

Request flow:
1. User authenticates via API key validation (`src/app/api/validate-key/route.ts`).
2. Requests hit Next.js App Router pages (e.g., `/dashboard/compose`), rendering React Server Components.
3. Hooks (e.g., `useAccounts`, `usePosts`) fetch/mutate data via Late API client (`src/lib/late-api/client.ts`), pivoting control to server actions or API routes.
4. Data traverses hooks → Late API → external platforms (Instagram, TikTok, etc.), with optimistic UI updates.
5. Control returns via SWR-like caching in hooks, ensuring real-time queue previews and post states.

Deployment model: Serverless functions for API routes, with persistent storage via Late API backend (no local DB).

## Architectural Layers

- **App Router & Pages**: Entry points and layouts for user flows (`src/app/`, `src/app/dashboard/`).
- **Components**: UI primitives and domain-specific views (`src/components/`, `src/components/shared/`, `src/app/*/ _components/`).
- **Hooks**: Data fetching, mutations, and derived state (`src/hooks/` – e.g., `use-queue.ts`, `use-posts.ts`).
- **Lib & Utils**: Shared utilities, API clients, and types (`src/lib/` – e.g., `late-api/`, `timezones.ts`, `avatar.ts`).
- **Stores**: Global app state management (`src/stores/`).

## Provider Architecture (Manifest + Runtime Registry)

Provider extensibility is split into two layers:

- **Catalog (isomorphic, safe for client):**
  - `src/lib/providers/catalog/types.ts`
  - `src/lib/providers/catalog/entries.ts`
  - `src/lib/providers/catalog/index.ts`
  - Holds provider metadata (`identifier`, auth/connect mode, required credentials,
    settings keys, capabilities, status).
- **Runtime registry (server-only):**
  - `src/lib/providers/runtime/registry.ts`
  - Maps active provider identifiers to executable provider types (`late` or `byo`).

Publishing uses a provider snapshot:

- `SocialAccount.providerIdentifier` defines the account connector.
- `PlatformPost.providerIdentifier` snapshots the connector used for that destination.
- Runner resolves by `PlatformPost.providerIdentifier` first to avoid behavior drift when
  account config changes after scheduling.

> See [`codebase-map.json`](./codebase-map.json) for complete symbol counts and dependency graphs.

## Detected Design Patterns

| Pattern | Confidence | Locations | Description |
|---------|------------|-----------|-------------|
| Custom React Hooks | 95% | `src/hooks/use-*.ts` (e.g., [use-queue.ts](../src/hooks/use-queue.ts), [use-posts.ts](../src/hooks/use-posts.ts)) | Encapsulate API calls, mutations, and optimistic updates for posts, queues, accounts; composable for dashboard views. |
| Factory | 90% | [`createLateClient`](../src/lib/late-api/client.ts), [`getServerClient`](../src/lib/late-api/client.ts) | Instantiates platform-agnostic Late API clients with auth scoping. |
| Adapter | 85% | [`src/lib/late-api/types.ts`](../src/lib/late-api/types.ts) | Maps platform-specific data (e.g., `TikTokPlatformData`) to unified `PlatformPost` interfaces. |
| Compound Component | 80% | `src/components/shared/platform-icon.tsx` (e.g., `PlatformIcon`, `PlatformBadge`) | Nested icons and badges for platform rendering. |

## Entry Points

- [Root Layout](../src/app/layout.tsx) – `RootLayout`, `Providers`.
- [API Key Validation](../src/app/api/validate-key/route.ts) – `POST` handler.
- [Dashboard Compose](../src/app/dashboard/compose/page.tsx).
- [Dashboard Queue](../src/app/dashboard/queue/page.tsx).
- [Dashboard Calendar](../src/app/dashboard/calendar/page.tsx).
- [Dashboard Accounts](../src/app/dashboard/accounts/page.tsx).
- [OAuth Callback](../src/app/callback/page.tsx).

## Public API

| Symbol | Type | Location |
|--------|------|----------|
| `Account` | Interface | [src/hooks/use-accounts.ts:13](../src/hooks/use-accounts.ts#L13) |
| `AccountHealth` | Interface | [src/hooks/use-accounts.ts:25](../src/hooks/use-accounts.ts#L25) |
| `AvatarStyle` | Type | [src/lib/avatar.ts:7](../src/lib/avatar.ts#L7) |
| `cn` | Function | [src/lib/utils.ts:4](../src/lib/utils.ts#L4) |
| `CommonTimezone` | Type | [src/lib/timezones.ts:59](../src/lib/timezones.ts#L59) |
| `createLateClient` | Function | [src/lib/late-api/client.ts:6](../src/lib/late-api/client.ts#L6) |
| `CreatePostInput` | Interface | [src/hooks/use-posts.ts:37](../src/hooks/use-posts.ts#L37) |
| `formatInTimezone` | Function | [src/lib/timezones.ts:138](../src/lib/timezones.ts#L138) |
| `getAvatarUrl` | Function | [src/lib/avatar.ts:25](../src/lib/avatar.ts#L25) |
| `getServerClient` | Function | [src/lib/late-api/client.ts:23](../src/lib/late-api/client.ts#L23) |
| `Platform` | Type | [src/lib/late-api/types.ts:4](../src/lib/late-api/types.ts#L4) |
| `PlatformPost` | Interface | [src/hooks/use-posts.ts:30](../src/hooks/use-posts.ts#L30) |
| `QueueSlot` | Interface | [src/hooks/use-queue.ts:16](../src/hooks/use-queue.ts#L16) |
| `useAccounts` | Hook | [src/hooks/use-accounts.ts:34](../src/hooks/use-accounts.ts#L34) |
| `usePosts` | Hook | [src/hooks/use-posts.ts:58](../src/hooks/use-posts.ts#L58) |
| `useQueueSlots` | Hook | [src/hooks/use-queue.ts:95](../src/hooks/use-queue.ts#L95) |

> Full list includes 50+ exports; see [`codebase-map.json`](./codebase-map.json) for exhaustive details.

## Internal System Boundaries

Domains are loosely bounded by hooks: 
- **Accounts** (`use-accounts.ts`): Owns platform connections; syncs health via Late API polls.
- **Posts** (`use-posts.ts`): Manages CRUD; shares `PlatformPost` contracts with queues.
- **Queues** (`use-queue.ts`): Schedules posts; enforces slot normalization seams.
Data ownership resides in Late API backend; frontend uses read-only projections with optimistic mutations. Shared types (e.g., `PlatformSpecificData`) enforce contracts.

## External Service Dependencies

- **Late API** (`src/lib/late-api/`): Primary backend for posts, accounts, queues. Auth via API keys (`createLateClient`); no public rate limits documented – handle retries in hooks (e.g., `useRetryPost`). Failures trigger UI toasts and queue reverts.
- **Social Platforms** (via Late): TikTok, Instagram, Facebook, etc. – OAuth via `/callback`; assumes Late handles rate limits and token refresh.
- **S3-compatible Storage**: Media presigns/uploads (`useMediaPresign`, `useUploadMedia`); failures fallback to retry queues.

## Key Decisions & Trade-offs

- **Hooks over Redux/Zustand alone**: Hooks enable server-side data fetching in RSC; trade-off: client-only caching requires hydration sync.
- **Monolith vs. Microservices**: Single deploy simplifies ops; scales vertically until 10k+ posts/day.
- **Late API integration**: Abstracts platform complexity; alternative (direct SDKs) rejected for maintenance cost.
- **No local DB**: Relies on Late for persistence; enables instant deploys but couples to vendor.

## Diagrams

```mermaid
graph TD
    User[User Browser] -->|Next.js App Router| Layout[RootLayout & Providers]
    Layout --> Dashboard[Dashboard Pages<br/>(compose, queue, calendar)]
    Dashboard --> Hooks[Custom Hooks<br/>(usePosts, useQueue, useAccounts)]
    Hooks --> LateClient[Late API Client<br/>createLateClient]
    LateClient --> LateAPI[Late API Backend]
    LateAPI --> Platforms[TikTok, Instagram,<br/>Facebook, etc.]
    Hooks -.-> Stores[Global Stores<br/>(auth-store, app-store)]
    Platforms --> Media[S3 Media Uploads]

    classDef client fill:#e1f5fe
    classDef server fill:#f3e5f5
    classDef external fill:#fff3e0
    class User,Layout,Dashboard,Hooks, Stores client
    class LateClient,LateAPI server
    class Platforms,Media external
```

## Risks & Constraints

- **Vendor Lock-in**: Heavy Late API reliance; mitigate via abstract client interface.
- **Scale Limits**: Serverless cold starts for heavy queue previews (>100 slots); optimize with pagination.
- **Platform Variability**: `PlatformSpecificData` unions risk incomplete coverage; monitor health checks.
- **Timezone Edge Cases**: Relies on `luxon`-like utils; UTC pivots prevent drift.

## Top Directories Snapshot

- `src/app/` (~15 files): Pages, layouts, API routes.
- `src/components/` (~20 files): UI components, shared primitives.
- `src/hooks/` (~8 files): Core data hooks.
- `src/lib/` (~10 files): Utils, API clients, types.
- `src/stores/` (~2 files): Global state.

## Related Resources

- [Project Overview](./project-overview.md)
- [Data Flow](./data-flow.md)
- [`codebase-map.json`](./codebase-map.json)
