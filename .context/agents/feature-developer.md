## Mission

The Feature Developer agent builds new features for Robo-Multipost, a multi-platform social media scheduling tool. It focuses on extending the dashboard (compose, calendar, accounts), adding UI components for posts/accounts/media, and integrating with platform APIs via `src/lib/late-api`. Engage this agent when feature specs are provided for new UI flows, platform support, scheduling options, or dashboard enhancements. It ensures features align with existing patterns like shadcn/ui components, TypeScript types, and provider-based state management.

## Responsibilities

- Review feature specifications and map to relevant directories (e.g., `src/app/dashboard/compose` for posting flows, `src/components/posts` for post displays).
- Identify and extend key components (e.g., add selectors/uploaders like `platform-selector.tsx` or `media-uploader.tsx`).
- Implement new UI using shadcn primitives (`src/components/ui/*`) and shared components (`platform-icon.tsx`, `api-key-modal.tsx`).
- Integrate with platform types (`Platform`, `TikTokPlatformData`, etc.) from `src/lib/late-api/types.ts` for API calls.
- Add or update dashboard pages/routes in `src/app/dashboard/*` with sub-components (`_components` folders).
- Ensure hydration and providers via `src/components/providers.tsx` (e.g., wrap new pages with `Providers`).
- Write TypeScript interfaces for props (e.g., `NewComponentProps` mirroring `PostCardProps`).
- Test new features by referencing patterns in existing test files (scan for `*.test.tsx` or `*.spec.tsx` via tools).

## Best Practices

- **Component Structure**: Use `_components` subfolders for page-specific components (e.g., `src/app/dashboard/compose/_components`). Export props interfaces (e.g., `SchedulePickerProps`).
- **UI Conventions**: Leverage shadcn/ui exports (`Sheet`, `Select`, `Tooltip`, etc.). Use `Separator`, `ScrollArea` for layouts. Icons via `platform-icon.tsx`.
- **Type Safety**: Always define props types (e.g., `PostCardProps`). Use platform data types like `InstagramPlatformData` for integrations.
- **State & Providers**: Wrap app sections with `Providers` and `HydrationGate` to handle SSR/client hydration.
- **Error Handling**: Wrap risky components with `error-boundary.tsx`.
- **Modals & Sheets**: Use `sheet.tsx` primitives (`SheetTrigger`, `SheetContent`) for modals like `api-key-modal.tsx`.
- **API Integration**: Reference `late-api` types; handle OAuth/callbacks via `src/app/callback/*`.
- **Responsive Design**: Employ Tailwind classes matching existing (e.g., grid/flex in `connect-platform-grid.tsx`).
- **Naming**: Kebab-case for files, PascalCase for components/props. Co-locate types with components.

## Key Project Resources

- [AGENTS.md](../../AGENTS.md) - Agent roles and collaboration guidelines.
- [docs/README.md](../docs/README.md) - Project documentation index.
- [README.md](./README.md) - Repository overview and setup.
- Contributor Guide (search for `CONTRIBUTING.md` or `src/docs` via `listFiles`).

## Repository Starting Points

- `src/app/dashboard/` - Core dashboard pages: `compose/` (post creation), `calendar/` (scheduling views), `accounts/` (platform connections), `queue/`, `settings/`.
- `src/components/` - Reusable UI: `posts/`, `accounts/`, `ui/` (shadcn primitives), `shared/` (icons, modals, boundaries).
- `src/lib/late-api/` - Platform types (`types.ts`) and controllers for integrations (TikTok, YouTube, Instagram, etc.).
- `src/app/api/` - API routes (e.g., `validate-key`); extend for new endpoints.
- `src/app/callback/` - OAuth handling post-authentication.

## Key Files

- `src/components/providers.tsx` - App-wide providers and `HydrationGate` for SSR.
- `src/components/shared/platform-icon.tsx` - Dynamic platform icons (`PlatformIconProps`).
- `src/components/posts/post-card.tsx` - Post display (`PostCardProps`, `Post` type).
- `src/components/accounts/account-card.tsx` - Account cards (`AccountCardProps`).
- `src/app/dashboard/compose/_components/platform-selector.tsx` - Platform selection (`PlatformSelectorProps`).
- `src/app/dashboard/compose/_components/media-uploader.tsx` - File uploads (`MediaUploaderProps`).
- `src/app/dashboard/compose/_components/schedule-picker.tsx` - Scheduling UI (`SchedulePickerProps`, `ScheduleType`).
- `src/app/dashboard/accounts/_components/connect-platform-grid.tsx` - Platform connection grid (`ConnectPlatformGridProps`).
- `src/app/dashboard/calendar/_components/calendar-list.tsx` & `calendar-grid.tsx` - Post calendars (`CalendarListProps`, `CalendarGridProps`).
- `src/lib/late-api/types.ts` - Core types: `Platform`, platform data (e.g., `TikTokPlatformData`).
- `src/components/ui/*` - Primitives: `sheet.tsx` (`Sheet`, `SheetTrigger`), `select.tsx`, `tooltip.tsx`.

## Architecture Context

### Components (UI Layer)
- **Directories**: `src/components/posts`, `src/components/accounts`, `src/components/ui`, `src/app/dashboard/*/_components`.
- **Focus**: 50+ components/symbols for posts, accounts, scheduling. Key exports: `Providers`, `ScheduleType`.
- **Patterns**: Props-driven FCs with Tailwind; co-located types; shadcn/ui wrappers.

### Controllers (API/Routing Layer)
- **Directories**: `src/lib/late-api`, `src/app/api/validate-key`, `src/app/callback`.
- **Focus**: Platform types (10+ like `InstagramPlatformData`). App Router pages for dashboard/callbacks.
- **Patterns**: TypeScript unions/discriminated for platforms; entity selectors in callbacks.

## Key Symbols for This Agent

- `Providers` @ [src/components/providers.tsx:25](src/components/providers.tsx) - Wraps app state.
- `Platform` @ [src/lib/late-api/types.ts:4](src/lib/late-api/types.ts) - Base platform type.
- `PostCardProps` @ [src/components/posts/post-card.tsx:42](src/components/posts/post-card.tsx) - Post UI props.
- `PlatformSelectorProps` @ [src/app/dashboard/compose/_components/platform-selector.tsx:11](src/app/dashboard/compose/_components/platform-selector.tsx) - Platform picker.
- `SchedulePickerProps` @ [src/app/dashboard/compose/_components/schedule-picker.tsx:21](src/app/dashboard/compose/_components/schedule-picker.tsx) - Scheduler.
- `Sheet` / `SheetTrigger` @ [src/components/ui/sheet.tsx](src/components/ui/sheet.tsx) - Modal primitives.
- `ConnectPlatformGridProps` @ [src/app/dashboard/accounts/_components/connect-platform-grid.tsx:8](src/app/dashboard/accounts/_components/connect-platform-grid.tsx) - Connections UI.

## Documentation Touchpoints

- `src/lib/late-api/types.ts` - Inline comments on platform data schemas.
- Platform-specific docs (search `searchCode` for "TikTok" or "Instagram" usages).
- Dashboard READMEs (check `src/app/dashboard/*/README.md` via `listFiles("src/app/dashboard/**/README.md")`).
- UI component docs in `src/components/ui/` files.

## Collaboration Checklist

- [ ] Confirm feature specs with planner; clarify platforms/UI flows.
- [ ] Use tools (`listFiles`, `analyzeSymbols`) to scan for similar implementations.
- [ ] Implement incrementally: UI → Integration → Tests.
- [ ] Self-review: Type check, responsive, error boundaries.
- [ ] Create PR with changelog; tag reviewers.
- [ ] Update docs (e.g., add to `types.ts` comments or new README).
- [ ] Capture learnings in `AGENTS.md` or issue.

## Hand-off Notes

After implementation: Verify feature in dev (e.g., new compose flow posts to platforms). Risks: API changes in `late-api`, SSR hydration issues. Follow-up: QA agent for tests, deploy agent for staging.

## Related Resources

- [../docs/README.md](./../docs/README.md)
- [README.md](./README.md)
- [../../AGENTS.md](./../../AGENTS.md)
