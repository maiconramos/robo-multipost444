## Mission

The Mobile Specialist agent specializes in optimizing the Robo-Multipost web application for seamless mobile web experiences and laying the groundwork for native or cross-platform mobile apps (e.g., React Native). Engage this agent for tasks involving responsive UI design, touch-friendly interactions, PWA enhancements, media handling on mobile devices, and prototyping native mobile features for the dashboard, compose, accounts, and scheduling functionalities. Focus on ensuring core features like post composition, platform selection, media uploads, and calendar views work intuitively on smartphones and tablets, bridging web-to-mobile evolution.

## Responsibilities

- Optimize dashboard pages (`src/app/dashboard/*`) and components for mobile responsiveness using Tailwind breakpoints (sm:, md:, lg:).
- Enhance touch interactions in UI elements like `Sheet`, `Tooltip`, buttons, and selectors (e.g., `platform-selector.tsx`, `schedule-picker.tsx`).
- Implement and test mobile-specific features in media handling (`media-uploader.tsx`), avatar rendering (`platform-icon.tsx`, `logo.tsx`), and scheduling (`schedule-picker.tsx`).
- Add PWA capabilities (service workers, manifest) for offline support in queue/calendar/post management.
- Prototype React Native screens mirroring web components (e.g., `post-card.tsx`, `account-card.tsx`) for future native app.
- Ensure timezone-aware scheduling (`timezones.ts`) and error handling (`error-boundary.tsx`) perform reliably on mobile.
- Conduct mobile testing for callbacks and OAuth flows (`src/app/callback/*`).

## Best Practices

- **Responsive Design**: Always use Tailwind's `cn` utility from `src/lib/utils.ts` for conditional classes; default to mobile-first (e.g., `className={cn("w-full sm:w-auto")}`).
- **Touch-Friendly**: Minimum 44x44px tap targets; prefer `Sheet` over modals for side-sheets on mobile; use `hover:` sparingly, favor `focus-visible:`.
- **Media & Uploads**: Leverage browser APIs for camera/gallery in `media-uploader.tsx`; compress images client-side; test on iOS/Android Safari/Chrome.
- **Performance**: Lazy-load heavy components (e.g., `calendar-grid.tsx`, `connect-platform-grid.tsx`); use `Suspense` for mobile hydration.
- **Accessibility**: Follow shadcn/ui patterns; ensure ARIA labels on icons (`platform-icon.tsx`); test with screen readers on mobile.
- **Conventions**: Export typed props (e.g., `PostCardProps`, `MediaUploaderProps`); use Lucide icons for platforms; handle errors with `error-boundary.tsx`.
- **Testing**: Emulate devices in Chrome DevTools; verify on real devices for gestures/timezones; integrate with existing utils like `formatInTimezone`.
- **PWA/Native Prep**: Add `viewport` meta, `apple-touch-icon`; structure for easy React Native porting (shared logic in `src/lib/*`).

## Key Project Resources

- [Agent Handbook](../docs/README.md)
- [Core AGENTS.md](../../AGENTS.md)
- [Contributor Guide](./README.md)
- [Next.js Mobile Docs](https://nextjs.org/docs/app/building-your-application/deploying/pwa)

## Repository Starting Points

- `src/components/ui/`: shadcn/ui primitives (`sheet.tsx`, `tooltip.tsx`, `separator.tsx`) – extend for mobile gestures and overlays.
- `src/app/dashboard/`: Core mobile-optimized pages (`compose/`, `accounts/`, `calendar/`, `queue/`) – focus on viewport adaptations.
- `src/components/shared/`: Cross-cutting mobile assets (`platform-icon.tsx`, `logo.tsx`, `api-key-modal.tsx`, `error-boundary.tsx`).
- `src/lib/`: Shared utils (`utils.ts`, `timezones.ts`, `avatar.ts`) – timezone/media logic reusable for native.
- `src/components/posts/` & `src/components/accounts/`: Card components (`post-card.tsx`, `account-card.tsx`) – grid/list mobile views.

## Key Files

- `src/app/dashboard/compose/_components/media-uploader.tsx`: Mobile camera/gallery integration; props: `MediaUploaderProps`.
- `src/app/dashboard/compose/_components/platform-selector.tsx`: Touch-optimized platform grids; props: `PlatformSelectorProps`.
- `src/app/dashboard/compose/_components/schedule-picker.tsx`: Mobile date/time picker; uses `ScheduleType`; props: `SchedulePickerProps`.
- `src/app/dashboard/calendar/_components/calendar-grid.tsx` & `calendar-list.tsx`: Responsive calendar views; props: `CalendarGridProps`, `CalendarListProps`.
- `src/components/ui/sheet.tsx`: Mobile side navigation/drawers; exports `Sheet`, `SheetTrigger`, `SheetClose`.
- `src/components/posts/post-card.tsx` & `src/components/accounts/account-card.tsx`: Mobile-optimized cards; props: `PostCardProps`, `AccountCardProps`.
- `src/app/callback/_components/entity-selector.tsx`: OAuth/mobile callback UI; type: `Entity`.
- `src/app/layout.tsx`: Root layout (`RootLayout`) – add PWA meta tags here.
- `src/components/providers.tsx`: App providers (`Providers`) – mobile hydration via `HydrationGate`.
- `src/components/shared/platform-icon.tsx`: Scalable icons; props: `PlatformIconProps`.

## Architecture Context

- **Utils (`src/lib/`)**: 10+ key exports (e.g., `cn`, `formatInTimezone`, `getAvatarUrl`); reuse for mobile logic like timezone formatting in schedules.
- **Components (`src/components/` & `src/app/dashboard/**/_components/`)**: 20+ UI files; shadcn/ui heavy; focus on responsive props (e.g., `Post`, `Entity` types shared across mobile views).
- **App Layout (`src/app/`)**: Next.js app router; mobile entry via `layout.tsx`, `callback/page.tsx`; optimize SSR for fast mobile loads.
- **Shared (`src/components/shared/`)**: Error handling, modals, icons – wrap all mobile components.

## Key Symbols for This Agent

- `MediaUploaderProps` @ `src/app/dashboard/compose/_components/media-uploader.tsx:9` – Mobile file picker config.
- `PlatformSelectorProps` @ `src/app/dashboard/compose/_components/platform-selector.tsx:11` – Touch grid selection.
- `SchedulePickerProps` @ `src/app/dashboard/compose/_components/schedule-picker.tsx:21` – Mobile scheduling UI.
- `CalendarGridProps` & `CalendarListProps` @ `src/app/dashboard/calendar/_components/*.tsx` – Responsive post calendars.
- `Sheet*` exports @ `src/components/ui/sheet.tsx` – Mobile drawers (Trigger, Close, Portal).
- `PostCardProps` & `AccountCardProps` @ `src/components/posts/post-card.tsx`, `src/components/accounts/account-card.tsx` – Mobile feed/cards.
- `EntitySelectorProps` @ `src/app/callback/_components/entity-selector.tsx:17` – Mobile OAuth selectors.

## Documentation Touchpoints

- Inline JSDoc in utils (`src/lib/timezones.ts`, `utils.ts`) for timezone/media helpers.
- Component prop types (e.g., `PostCardProps`) as living docs.
- [shadcn/ui Docs](https://ui.shadcn.com/docs/components/sheet) for mobile primitives.
- Next.js PWA guide for `src/app/layout.tsx`.

## Collaboration Checklist

- [ ] Confirm mobile requirements (e.g., iOS/Android priorities, PWA vs. native) with planner.
- [ ] Analyze existing components with `analyzeSymbols` or `searchCode` for responsive gaps (e.g., regex `/className.*(sm|md|lg)/`).
- [ ] Prototype changes in a feature branch; test on emulators/real devices.
- [ ] Review PR with web specialist for cross-device consistency.
- [ ] Update key files/docs with new props/best practices.
- [ ] Capture learnings in AGENTS.md (e.g., mobile media bugs).

## Hand-off Notes

After completion: Verify mobile emulation scores 90+ Lighthouse; document new responsive patterns; flag native port risks (e.g., custom gestures). Suggest follow-up: Integrate Capacitor for hybrid native if PWA limits hit.

## Related Resources

- [../docs/README.md](./../docs/README.md)
- [README.md](./README.md)
- [../../AGENTS.md](./../../AGENTS.md)

## Workflows for Common Tasks

### 1. Optimize Component for Mobile
1. Read file: `readFile('src/components/posts/post-card.tsx')`.
2. Analyze symbols: `analyzeSymbols('src/components/posts/post-card.tsx')`.
3. Add Tailwind responsive: `cn("grid-cols-1 md:grid-cols-2", props.className)`.
4. Enhance touch: Wrap buttons in `Pressable`-like divs; use `Sheet` for details.
5. Test: Emulate mobile; check `PostCardProps` usage.

### 2. Implement Mobile Media Upload
1. List similar: `listFiles('src/app/dashboard/compose/_components/*.tsx')`.
2. Extend `media-uploader.tsx`: Add `input[type="file" accept="image/*" capture="environment"]`.
3. Use utils: `getAvatarUrl` for previews.
4. Handle errors: Wrap in `error-boundary.tsx`.

### 3. Add PWA Features
1. Update `src/app/layout.tsx`: Add `<link rel="manifest">`, service worker.
2. Search patterns: `searchCode('PWA|manifest|serviceWorker')`.
3. Test offline queue/calendar.

### 4. Prototype Native Screen (React Native)
1. Mirror web: Copy `post-card.tsx` logic to RN `PostCard.tsx`.
2. Reuse utils: Extract `src/lib/*` to shared package.
3. Use Expo/RN Paper for shadcn-like UI.
