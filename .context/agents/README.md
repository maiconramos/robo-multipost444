# Feature Developer Playbook

## Role Overview
The Feature Developer agent implements new features in the Robo-Multipost application, a Next.js web app for multi-platform social media posting, scheduling, and account management. Focus on extending dashboard functionality (compose, calendar, accounts, queue, settings), UI components, platform integrations, and API routes. Ensure features align with existing patterns for platforms like TikTok, YouTube, Pinterest, Instagram, Facebook, LinkedIn, Google Business, Telegram, and Threads.

Prioritize:
- User-facing enhancements (e.g., new compose tools, platform connectors).
- Backend API extensions (e.g., validation, posting logic).
- Reusable UI components following shadcn/ui conventions.

## Key Focus Areas
### 1. UI Components and Dashboard Pages
- **Directories**: 
  - `src/components/*` (shared, posts, accounts, ui).
  - `src/app/dashboard/*` (compose, calendar, accounts, queue, settings).
  - `src/app/callback/*`.
- **Purpose**: Build interactive elements like post composers, platform selectors, calendars, and account grids. Use composable props-based components.

### 2. API and Controllers
- **Directories**: 
  - `src/lib/late-api/*` (core API logic, types).
  - `src/app/api/*` (e.g., validate-key).
- **Purpose**: Handle platform data, authentication callbacks, post scheduling, and validation.

### 3. Shared Utilities
- **Directories**: `src/components/shared/*`, `src/components/providers.tsx`.
- **Purpose**: Icons, modals, error boundaries, providers for hydration and state.

### 4. Platform-Specific Logic
- Extend types in `src/lib/late-api/types.ts` for new platforms.
- Update selectors and grids for new integrations.

## Key Files and Their Purposes
| File Path | Purpose |
|-----------|---------|
| `src/lib/late-api/types.ts` | Defines core types: `Platform`, platform-specific data (`TikTokPlatformData`, etc.). **Extend here for new platforms.** |
| `src/components/shared/platform-icon.tsx` | Renders platform icons/badges (`PlatformIcon`, `PlatformBadge`). Props: `PlatformIconProps`. |
| `src/components/posts/post-card.tsx` | Displays individual posts. Props: `PostCardProps` (uses `Post` type). |
| `src/components/accounts/account-card.tsx` | Shows connected accounts. Props: `AccountCardProps`. |
| `src/app/dashboard/compose/_components/platform-selector.tsx` | Selects platforms for posting. Props: `PlatformSelectorProps`. |
| `src/app/dashboard/compose/_components/media-uploader.tsx` | Handles media uploads. Props: `MediaUploaderProps`. |
| `src/app/dashboard/compose/_components/schedule-picker.tsx` | Schedule selection (`ScheduleType`). Props: `SchedulePickerProps`. |
| `src/app/dashboard/calendar/_components/calendar-list.tsx`<br>`src/app/dashboard/calendar/_components/calendar-grid.tsx` | List/grid views for scheduled posts. Props: `CalendarListProps`, `CalendarGridProps`. |
| `src/app/dashboard/accounts/_components/connect-platform-grid.tsx` | Grid for connecting platforms. Props: `ConnectPlatformGridProps`. |
| `src/app/callback/_components/entity-selector.tsx`<br>`src/app/callback/_components/callback-client.tsx` | Handles OAuth callbacks, entity selection (`Entity`, `EntityData`). |
| `src/components/providers.tsx` | Root providers (`Providers`, `HydrationGate`) for app-wide state/hydration. |
| `src/components/shared/api-key-modal.tsx` | API key input modal. Props: `ApiKeyModalProps`. |
| `src/components/shared/error-boundary.tsx` | Global error handling. Props: `Props`, state: `State`. |
| `src/components/ui/*` (e.g., `tooltip.tsx`, `sheet.tsx`, `select.tsx`) | shadcn/ui primitives: `TooltipContent`, `Sheet`/`SheetTrigger`/`SheetClose`, etc. **Re-export and compose these.** |

## Code Conventions and Best Practices
### TypeScript Patterns
- **Exported Types**: Always export platform data types (e.g., `NewPlatformData extends Platform`).
- **Props Interfaces**: Define explicit props (e.g., `ComponentProps { platform: Platform; onSelect?: () => void; }`).
- **Union Types**: Use `Platform` union for selectors (e.g., `TikTok \| YouTube \| ...`).

### Component Patterns
- **Functional Components with Props**: `interface Props { ... } const Component = ({ ... }: Props) => { ... }`.
- **shadcn/ui Integration**: Wrap primitives (e.g., `<Sheet><SheetTrigger>Connect</SheetTrigger>...</Sheet>`).
- **Tailwind CSS**: Utility-first classes (e.g., `flex flex-col gap-4 p-6`).
- **i18n Required**: All user-facing frontend strings must go through `useI18n()` and `t("...")` (PT-BR default, EN secondary). No hardcoded strings in new UI/toasts.
- **Icons/SVGs**: Use `platform-icon.tsx` for consistency; extend `PlatformIconProps`.
- **Error Handling**: Wrap in `error-boundary.tsx`.
- **Hydration**: Use `HydrationGate` in providers for SSR safety.

### Next.js Patterns
- **App Router**: Pages in `src/app/dashboard/[page]`, components in `_components`.
- **API Routes**: Server actions or route handlers in `src/app/api/*`.
- **Revalidation**: Use `revalidatePath` or `revalidateTag` for dynamic data.

### Styling and Accessibility
- ARIA labels on selectors/icons.
- Responsive: `md:`, `lg:` prefixes.
- Loading States: Skeletons via `ui/skeleton.tsx`.

### State Management
- Client-side: `useState`, `useEffect`; no heavy libraries visible.
- Server Components: Default; mark `'use client'` only when needed.

## Workflows for Common Tasks
### 1. Adding a New Platform Integration
1. **Extend Types**: Add `NewPlatformData` to `src/lib/late-api/types.ts`.
2. **UI Icon**: Copy `platform-icon.tsx` pattern; export `NewPlatformIcon`.
3. **Update Selectors/Grids**:
   - `platform-selector.tsx`: Add to platform list/options.
   - `connect-platform-grid.tsx`: New grid item with connector button.
4. **Callback Handler**: Extend `callback-client.tsx`/`entity-selector.tsx` for OAuth.
5. **API Route**: Add validation in `src/app/api/validate-key` or new route.
6. **Test in Compose**: Ensure `platform-selector.tsx` and `schedule-picker.tsx` handle it.
7. **Dashboard Integration**: Update accounts/calendar views.

### 2. New Compose Feature (e.g., Post Template)
1. **New Component**: `src/app/dashboard/compose/_components/post-template.tsx` with props.
2. **Integrate**: Add to compose page; use `Sheet` for preview.
3. **Media/State**: Hook into `media-uploader.tsx` and schedule picker.
4. **API**: POST to late-api equivalent.
5. **Providers**: Ensure client-side state via `'use client'`.

### 3. Dashboard Page Enhancement (e.g., New Tab in Settings)
1. **Page Structure**: Add route/component in `src/app/dashboard/settings`.
2. **Layout**: Use shared UI (`sheet.tsx`, `select.tsx`).
3. **Data Fetch**: Server Component with `fetch` to late-api.
4. **Interactions**: Client components for forms/modals (`api-key-modal.tsx` pattern).

### 4. API Route for Feature
1. **New Route**: `src/app/api/new-feature/route.ts`.
2. **Types**: Reuse/import from `late-api/types.ts`.
3. **Validation**: Zod schema; handle platforms union.
4. **Auth**: Check API keys via `validate-key`.

### 5. Full Feature Implementation Checklist
1. Analyze spec: Identify UI/API touchpoints.
2. List impacted files (use provided key files).
3. Implement components first (bottom-up).
4. Wire into pages/providers.
5. Handle edge cases (errors, loading, empty states).
6. Responsive/mobile checks.
7. No new deps without rationale.

## Testing Guidelines
- **No Existing Tests Visible**: Propose adding `__tests__` folders.
- Unit: React Testing Library for components (props rendering).
- Integration: Playwright/Cypress for dashboard flows.
- Mock late-api calls.

## Output Expectations
- Provide complete, copy-pasteable code diffs/files.
- Reference exact paths/symbols.
- Suggest follow-up (e.g., "Submit to code-reviewer").
