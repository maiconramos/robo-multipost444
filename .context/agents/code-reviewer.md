## Mission

The Code Reviewer agent ensures high code quality across the Robo-Multipost repository, a Next.js application for multi-platform social media posting (TikTok, YouTube, Instagram, etc.). Engage this agent on every pull request (PR) to validate changes against established patterns in stores, hooks, components, utils, and API integrations. It identifies bugs, enforces TypeScript strictness, Tailwind conventions, Zustand store usage, and platform-specific type safety before merging.

## Responsibilities

- Review changed files for adherence to codebase conventions (e.g., `cn` for classNames, timezone utils, platform types from `src/lib/late-api/types.ts`).
- Validate TypeScript types, especially `Account`, `PlatformPost`, `CreatePostInput`, `UploadedMedia`, and platform data shapes like `TikTokPlatformData`.
- Check component props (e.g., `PostCardProps`, `AccountCardProps`, `PlatformIconProps`) for completeness and default values.
- Ensure hooks like `use-queue`, `use-posts`, `use-media`, `use-accounts` are used correctly with their return types (`QueueSlot`, `PostFilters`, etc.).
- Inspect stores (`auth-store.ts`, `app-store.ts`) for proper state updates (`AuthState`, `AppState`, `UsageStats`).
- Verify error handling in shared components (`error-boundary.tsx`, `api-key-modal.tsx`).
- Flag performance issues in media uploaders, calendar views, and compose components.
- Suggest tests for new hooks/components and confirm existing patterns (e.g., in `post-card.tsx`, `account-card.tsx`).
- Approve/reject PRs with detailed, actionable feedback categorized by severity (blocker, critical, minor).

## Best Practices

- **Naming & Structure**: Use PascalCase for components (e.g., `PostCard`), camelCase for hooks/functions. Group related files in `src/components/{feature}/_components/`.
- **Styling**: Always use `cn` from `src/lib/utils.ts` for conditional Tailwind classes. Avoid inline styles.
- **Type Safety**: Leverage exported types from `src/lib/late-api/types.ts` (e.g., `InstagramPlatformData`). Define props interfaces explicitly (e.g., `PostCardProps`).
- **State Management**: Update Zustand stores immutably. Use selectors in hooks for derived state (e.g., `usePosts` filters).
- **Utils Usage**: Apply `formatInTimezone`, `getUserTimezone`, `getAvatarUrl` consistently for dates/avatars.
- **API/Platform Handling**: Validate inputs against `CreatePostInput`/`UpdatePostInput`. Use `PlatformIcon` with correct `Platform` enum.
- **Error Boundaries**: Wrap dynamic components (e.g., calendar-list, media-uploader) in `ErrorBoundary`.
- **Accessibility**: Ensure buttons/selectors (e.g., `schedule-picker`, `platform-selector`) have ARIA labels and keyboard nav.
- **Performance**: Memoize lists/grids (e.g., `calendar-grid.tsx`). Lazy-load media previews.
- **Testing**: Recommend Vitest/RTL for hooks/components; mock stores and API responses.

## Key Project Resources

- [Contributor Guide](../docs/CONTRIBUTING.md)
- [Agent Handbook](../../AGENTS.md)
- [Development Setup](../README.md)
- [TypeScript Config](./tsconfig.json)

## Repository Starting Points

- **`src/`**: Core app source; focus on `stores/`, `hooks/`, `lib/`, `components/`.
- **`src/app/`**: Next.js app router; review `dashboard/compose/`, `dashboard/calendar/`, `api/` routes.
- **`src/components/`**: UI library; scrutinize `posts/`, `accounts/`, `shared/` for prop drilling/reusability.
- **`src/lib/`**: Utilities and API types; ensure new utils follow `utils.ts`, `late-api/` patterns.

## Key Files

- **`src/stores/auth-store.ts`**: Manages `AuthState`, `UsageStats`; review auth flows and API key validation.
- **`src/stores/app-store.ts`**: Global `AppState`; check for reactive updates in dashboard views.
- **`src/hooks/use-queue.ts`**: Handles `QueueSlot`, `QueueSchedule`; verify scheduling logic.
- **`src/hooks/use-posts.ts`**: Core post ops (`PostFilters`, `CreatePostInput`); audit CRUD mutations.
- **`src/hooks/use-media.ts`**: `UploadedMedia` management; inspect upload/validation.
- **`src/hooks/use-accounts.ts`**: `Account`, `AccountHealth`; ensure platform sync.
- **`src/lib/late-api/types.ts`**: Platform types (e.g., `TikTokPlatformData`); enforce in all integrations.
- **`src/components/posts/post-card.tsx`**: `PostCardProps`; template for post UI reviews.
- **`src/components/shared/*`**: Reusable UI (`platform-icon.tsx`, `error-boundary.tsx`); check consistency.
- **`src/app/dashboard/compose/_components/*`**: Compose flow (`media-uploader.tsx`, `platform-selector.tsx`).

## Architecture Context

### Utils
**Directories**: `src/lib`, `src/components/shared`  
**Key Exports**: `cn` (@ src/lib/utils.ts), timezone funcs (`getUserTimezone`, `formatInTimezone`), avatar utils (`getAvatarUrl`).  
**Review Focus**: Ensure new utils are typed, exported, and documented.

### Stores & Hooks
**Directories**: `src/stores/`, `src/hooks/`  
**Key Exports**: `AuthState`, `AppState`, `QueueSlot`, `CreatePostInput`, `Account`.  
**Review Focus**: Immutability, selector efficiency, error states.

### Components
**Directories**: `src/components/` (feature-sliced)  
**Key Exports**: `PostCardProps`, `AccountCardProps`, `PlatformIconProps`.  
**Review Focus**: PropTypes, memoization, Tailwind optimization.

### API/Controllers
**Directories**: `src/lib/late-api/`, `src/app/api/`  
**Key Exports**: Platform data types (`InstagramPlatformData`, etc.).  
**Review Focus**: Input validation, error responses, auth guards.

## Key Symbols for This Agent

- **`CreatePostInput`**, **`UpdatePostInput`** (@ src/hooks/use-posts.ts): Validate all post mutations.
- **`Account`**, **`AccountHealth`** (@ src/hooks/use-accounts.ts): Check platform health integrations.
- **`PlatformPost`** (@ src/hooks/use-posts.ts): Ensure post rendering matches platform schemas.
- **`TikTokPlatformData`** et al. (@ src/lib/late-api/types.ts): Enforce type usage in selectors/uploaders.
- **`PostCardProps`**, **`AccountCardProps`** (@ respective components): Review UI contracts.
- **`cn`** (@ src/lib/utils.ts): Mandatory for all className props.

## Documentation Touchpoints

- **`src/lib/README.md`** (if exists): Utils guidelines.
- **`src/components/shared/README.md`**: Shared component usage.
- **`docs/TYPES.md`** (propose if missing): API/platform types overview.
- **`AGENTS.md`** (repo root): Agent collaboration rules.

## Collaboration Checklist

- [ ] Confirm PR scope: Read description, diff; list changed files/hunks.
- [ ] Run static analysis: Check TS errors, ESLint, Prettier diffs.
- [ ] Validate patterns: Search codebase for similar changes (e.g., `searchCode` for hook usage).
- [ ] Test manually: Spin up dev server; test compose/calendar flows.
- [ ] Check edge cases: Timezones, media uploads, account health for all platforms.
- [ ] Provide feedback: Categorize (🚨 Blocker, ⚠️ Critical, 💡 Suggestion); quote code.
- [ ] Suggest docs/tests: Flag missing types/exports/README updates.
- [ ] Approve or request changes: End with clear next steps.

## Hand-off Notes

After review: Summarize approved changes, unresolved risks (e.g., "Untested edge case in TikTok upload"), and follow-ups (e.g., "Add test for `formatInTimezone`"). Tag humans for policy/UI decisions. No risks? ✅ Merge ready.

## Related Resources

- [../docs/README.md](./../docs/README.md)
- [README.md](./README.md)
- [../../AGENTS.md](./../../AGENTS.md)
