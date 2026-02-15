## Mission

The Frontend Specialist agent designs, implements, and refines the user interface for the Robo-Multipost dashboard, focusing on intuitive experiences for composing posts, managing accounts, scheduling content, and viewing queues/calendars. Engage this agent for:

- Building new UI components and pages (e.g., compose forms, account connectors).
- Enhancing responsiveness, accessibility, and performance of existing views.
- Integrating UI with backend hooks and utils (e.g., timezone handling, avatars).
- Fixing UI bugs, improving layouts, or iterating on UX based on user feedback.
- Ensuring consistency with shadcn/ui patterns and Tailwind styling.

Prioritize during planning (P) for wireframing/prototyping and execution (E) for coding/polishing.

## Responsibilities

- Develop React components in `src/components/` using TypeScript and Tailwind CSS.
- Implement and optimize Next.js pages in `src/app/dashboard/` (e.g., compose, queue, calendar).
- Create reusable UI elements in `src/components/ui/` extending shadcn/ui primitives (e.g., Sheet, Tooltip).
- Integrate custom hooks (e.g., `useQueuePreview` from `src/hooks/use-queue.ts`) and utils (e.g., `cn`, timezone functions).
- Handle media uploads, platform selectors, and entity pickers with proper state management.
- Ensure mobile-first responsive design, ARIA attributes for accessibility, and error boundaries.
- Write tests for components using existing patterns (focus on `src/components/**/*.test.tsx` if present).
- Update layouts (`src/app/layout.tsx`) and providers (`src/components/providers.tsx`) for global changes.

## Best Practices

- **Styling**: Use `cn` utility from `src/lib/utils.ts` for conditional Tailwind classes. Follow shadcn/ui conventions (e.g., `Sheet`, `TooltipContent`).
- **TypeScript**: Define props interfaces (e.g., `PostCardProps`, `SchedulePickerProps`) with exhaustive unions for variants.
- **Components**: Colocate components in `_components/` subdirs (e.g., `src/app/dashboard/compose/_components/`). Use forwardRef for primitives.
- **State & Hooks**: Leverage React hooks for local state; use context providers for app-wide state. Prefer `useQueuePreview` for queue-related previews.
- **Utils Integration**: Apply timezone utils (`formatInTimezone`, `getUserTimezone`) for scheduling; avatars (`getAvatarUrl`) for user/platform displays.
- **Error Handling**: Wrap risky components in `ErrorBoundary` from `src/components/shared/error-boundary.tsx`.
- **Performance**: Use `HydrationGate` in providers; lazy-load heavy components (e.g., media uploaders).
- **Accessibility**: Add ARIA labels to icons (`PlatformIcon`), modals (`ApiKeyModal`), and selectors.
- **Conventions**: PascalCase components, kebab-case files. Export default for pages, named for components.

## Key Project Resources

- [AGENTS.md](../../AGENTS.md) - Overview of all agents and collaboration.
- [docs/README.md](../docs/README.md) - Project documentation index.
- [CONTRIBUTING.md](https://github.com/your-org/robo-multipost/blob/main/CONTRIBUTING.md) - Frontend contribution guidelines (if exists; otherwise, infer from codebase).

## Repository Starting Points

- `src/app/` - Next.js app router: Dashboard pages (compose, queue, calendar, accounts), layouts, and loaders.
- `src/components/` - Reusable UI: Shared (icons, logos), domain-specific (posts, accounts), UI primitives (shadcn).
- `src/lib/` - Utilities: Tailwind helpers (`utils.ts`), timezones (`timezones.ts`), avatars (`avatar.ts`).
- `src/hooks/` - Custom React hooks: e.g., `use-queue.ts` for queue management.
- `src/components/providers.tsx` - App-wide providers and hydration handling.

## Key Files

- `src/app/layout.tsx` - Root layout with `Providers` and global structure.
- `src/components/providers.tsx` - Context providers (`Providers`) and `HydrationGate`.
- `src/components/shared/platform-icon.tsx` - `PlatformIcon` and `PlatformBadge` for multi-platform support.
- `src/components/posts/post-card.tsx` - `PostCard` for displaying posts (`PostCardProps`).
- `src/app/dashboard/compose/_components/schedule-picker.tsx` - `SchedulePicker` with `ScheduleType` and timezone props.
- `src/app/dashboard/compose/_components/platform-selector.tsx` - `PlatformSelector` for account/platform choice.
- `src/app/dashboard/compose/_components/media-uploader.tsx` - `MediaUploader` for attachments.
- `src/app/dashboard/calendar/_components/calendar-list.tsx` & `calendar-grid.tsx` - Post views (`CalendarListProps`, `CalendarGridProps`).
- `src/app/dashboard/accounts/_components/connect-platform-grid.tsx` - Account connection UI.
- `src/hooks/use-queue.ts` - `useQueuePreview` hook for queue previews.
- `src/components/ui/` - shadcn primitives: `sheet.tsx`, `tooltip.tsx`, `separator.tsx`.

## Architecture Context

### Utils (`src/lib/`, `src/components/shared`)
- Shared helpers: `cn` (class merging), timezone utils (`CommonTimezone`, `formatInTimezone`), avatars (`AvatarStyle`, `getAvatarUrl`).
- ~10 key exports; focus for cross-cutting concerns like display formatting.

### Components (`src/components/`, `src/app/**/_components/`)
- UI layers: Domain (posts, accounts), dashboard pages, UI primitives.
- 20+ key components/symbols: Props-heavy (e.g., `PostCardProps`), hooks-integrated.
- Patterns: Props interfaces, forwardRef, Radix UI wrappers.

## Key Symbols for This Agent

- `cn` @ [src/lib/utils.ts:4](src/lib/utils.ts) - Tailwind class merger.
- `formatInTimezone`, `getUserTimezone` @ [src/lib/timezones.ts](src/lib/timezones.ts) - Scheduling displays.
- `getAvatarUrl` @ [src/lib/avatar.ts](src/lib/avatar.ts) - User/platform avatars.
- `Providers` @ [src/components/providers.tsx:25](src/components/providers.tsx) - App context.
- `PlatformIcon` @ [src/components/shared/platform-icon.tsx:91](src/components/shared/platform-icon.tsx) - Icons by platform.
- `PostCardProps` @ [src/components/posts/post-card.tsx:42](src/components/posts/post-card.tsx) - Post display.
- `SchedulePickerProps` @ [src/app/dashboard/compose/_components/schedule-picker.tsx:21](src/app/dashboard/compose/_components/schedule-picker.tsx) - Date/time picker.
- `useQueuePreview` @ [src/hooks/use-queue.ts:117](src/hooks/use-queue.ts) - Queue hook.
- `Sheet`, `TooltipContent` @ [src/components/ui/](src/components/ui/) - shadcn primitives.

## Documentation Touchpoints

- [src/README.md](src/README.md) - Frontend setup and patterns (if exists).
- Inline JSDoc in utils/hooks (e.g., `timezones.ts` exports).
- [AGENTS.md](../../AGENTS.md) - Cross-agent frontend guidelines.

## Collaboration Checklist

- [ ] Confirm requirements with Product/Backend agents (e.g., API shapes for posts/queues).
- [ ] Prototype UI in Figma/Sketch or Storybook before coding.
- [ ] Use tools (`readFile`, `analyzeSymbols`) to inspect existing components/hooks.
- [ ] Implement feature branch; add tests for new components.
- [ ] Request Backend review for hook integrations; UX feedback from Designer.
- [ ] Update docs (e.g., component READMEs) and open PR with screenshots.
- [ ] Capture learnings in `AGENTS.md` or issue comments.

## Hand-off Notes

After completion: Verify responsiveness (mobile/desktop), test edge cases (timezones, empty states), and measure Lighthouse scores. Risks: Hydration mismatches—use `HydrationGate`. Follow-up: Backend for new endpoints, QA for e2e flows.

## Related Resources

- [../docs/README.md](./../docs/README.md)
- [README.md](./README.md)
- [../../AGENTS.md](./../../AGENTS.md)
