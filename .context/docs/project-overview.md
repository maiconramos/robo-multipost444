## Project Overview

Hey there! Robo-Multipost is your all-in-one dashboard for scheduling and managing social media posts across platforms like Instagram, TikTok, Facebook, LinkedIn, and more—powered by the Late API. It tackles the chaos of switching between apps by letting you compose rich posts with media, set smart queues and calendars, connect accounts, and track everything in real-time. Content creators, social media managers, and marketers save hours while ensuring posts go live exactly when they should.

## Codebase Reference

> **Detailed Analysis**: For complete symbol counts, architecture layers, and dependency graphs, see [`codebase-map.json`](./codebase-map.json).

## Quick Facts

- Root: `/Users/maiconramos/Documents/workspace/robo-multipost`
- Languages: TypeScript/TSX (~150 files), with CSS/SCSS modules
- Entry: `src/app/layout.tsx` (Next.js root layout)
- Full analysis: [`codebase-map.json`](./codebase-map.json)

## Entry Points

- [`src/app/layout.tsx` (RootLayout)](src/app/layout.tsx#L67) — Main app layout and providers.
- [`src/app/dashboard/compose/page.tsx`](src/app/dashboard/compose/page.tsx) — Post composer and scheduler UI.
- [`src/app/api/validate-key/route.ts` (POST)](src/app/api/validate-key/route.ts#L4) — API key validation endpoint.
- [`src/app/callback/page.tsx`](src/app/callback/page.tsx) — OAuth callback handler for account connections.

## Key Exports

For the full list of 50+ exported symbols (hooks like `useAccounts`, types like `QueueSlot`, utils like `cn`), check [`codebase-map.json`](./codebase-map.json).

## File Structure & Code Organization

- `src/app/` — Next.js app router pages, layouts, API routes (dashboard, compose, calendar, accounts, callbacks).
- `src/components/` — Reusable UI components (posts, accounts, shared icons, modals, error boundaries).
- `src/hooks/` — Custom React hooks for data fetching/mutations (use-posts, use-queue, use-accounts, use-media).
- `src/lib/` — Utilities, Late API client/types, timezones, avatars, shared logic.
- `src/stores/` — Zustand stores for app/auth state.
- `docs/` — Project documentation and guides.

## Technology Stack Summary

Built on Next.js 14+ with the app router for a fast, server-rendered React frontend. TypeScript everywhere for type safety, Tailwind CSS for styling (via `cn` utility), and shadcn/ui for accessible components. Server-side uses API routes for auth/media/posts; client hooks handle optimistic updates. Build with `next build`, lint via ESLint/TSLint, format with Prettier—standard npm scripts power it all.

## Core Framework Stack

- **Frontend**: Next.js (app router, server components), React 18+ with hooks and Zustand for state.
- **API/Backend**: Next.js API routes + Late API client for platform integrations (posts, accounts, OAuth).
- **Data Layer**: Server actions/mutations via hooks; likely tRPC or fetch wrappers for queues/posts/media.
- Patterns: Hooks-first (custom composables), component colocation under `app/`, utils in `lib/` for loose coupling.

## UI & Interaction Libraries

shadcn/ui components (`src/components/ui/`) for buttons, modals, pickers; Lucide icons for platforms. Tailwind theming with dark mode support. Accessibility baked in (ARIA labels on badges/icons), no heavy localization yet—timezones handled via `lib/timezones.ts`. Platform badges (`PlatformIcon`) for visual consistency.

## Development Tools Overview

`npm run dev` for hot-reload server, `npm run build` for prod bundles. VS Code recommended with Tailwind/TS extensions. See [tooling.md](./tooling.md) for ESLint, Prettier setup, and debugging tips.

## Getting Started Checklist

1. Clone the repo: `git clone <repo-url> && cd robo-multipost`.
2. Install deps: `npm install`.
3. Set env vars (e.g., Late API key in `.env.local`).
4. Run dev server: `npm run dev`—open http://localhost:3000.
5. Connect a test account via dashboard/accounts and compose a post to verify.
6. Dive into [development-workflow.md](./development-workflow.md) for git flow and testing.

## Next Steps

Positioned as a lightweight scheduler for indie creators scaling to teams. Key stakeholders: product (multi-platform UX), eng (hooks/API perf). Check [architecture.md](./architecture.md) for layers, and Late API docs for platform limits.

## Related Resources

- [architecture.md](./architecture.md)
- [development-workflow.md](./development-workflow.md)
- [tooling.md](./tooling.md)
- [codebase-map.json](./codebase-map.json)
