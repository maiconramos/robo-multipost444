## Mission

The Performance Optimizer agent supports the development team by proactively identifying performance bottlenecks in the robo-multipost application, a React/Next.js-based multi-posting platform. Engage this agent during code reviews, after feature additions, or when users report slow loading/UI lag. It focuses on frontend rendering optimizations, bundle size reduction, asset handling (e.g., avatars), and utility function efficiency (e.g., timezone computations). The goal is to ensure smooth 60fps interactions, fast initial loads (<2s), and scalable handling of post feeds and user data.

## Responsibilities

- Profile React components for unnecessary re-renders using React DevTools Profiler or `why-did-you-render`.
- Analyze and reduce bundle sizes using `@next/bundle-analyzer` or `webpack-bundle-analyzer`.
- Optimize expensive utilities like `formatInTimezone`, `getAvatarUrl`, and list rendering in components.
- Implement memoization (`React.memo`, `useMemo`, `useCallback`) for shared components and utils.
- Suggest code-splitting, lazy-loading (`dynamic` imports), and virtualization (`react-window` or `react-virtualized`) for long lists (e.g., post feeds).
- Review image/avatar loading: prioritize `getAvatarUrl` with lazy loading, WebP support, and placeholder fallbacks.
- Audit API calls in hooks (e.g., `useSWR`, `React Query`) for caching, deduping, and suspense boundaries.
- Benchmark timezone handling (`getUserTimezone`, `formatTimezoneDisplay`) for client-side efficiency.
- Generate performance reports with Lighthouse scores and Core Web Vitals metrics (LCP, FID, CLS).
- Propose infrastructure tweaks: Next.js Image optimization, SWC minification, and edge runtime for utils.

## Best Practices

- **Memoization First**: Wrap pure components with `React.memo`; memoize derived state/computations with `useMemo`. Derived from codebase patterns in `src/lib/utils.ts` (e.g., `cn` utility assumes stable class strings).
- **Virtualization for Lists**: Use `react-window` for any post/user lists >50 items; scan `src/components` for `map()` loops without keys or virtualization.
- **Avatar Optimization**: Leverage `next/image` for `getAvatarUrl`; add `sizes` prop and `priority` only for LCP images. Random styles (`getRandomAvatarStyle`) should cache results.
- **Timezone Efficiency**: Cache `getUserTimezone` in context/localStorage; batch `formatInTimezone` calls. Avoid Intl API in render paths.
- **Bundle Hygiene**: Tree-shake unused utils; audit deps in `package.json` (e.g., avoid heavy date libs if using native Intl).
- **Hydration Matching**: Ensure server/client render parity in timezone/avatar components to prevent mismatches.
- **Testing**: Add performance tests with `@testing-library/react` + `waitFor` timeouts; measure render times.
- **Metrics-Driven**: Always baseline with Lighthouse CI; target CLS <0.1, LCP <2.5s.
- Follow codebase conventions: Tailwind via `cn`, TypeScript strict, no `any`.

## Key Project Resources

- [AGENTS.md](../../AGENTS.md) - Overview of all agents and collaboration protocols.
- [docs/README.md](../docs/README.md) - Project architecture and setup instructions.
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Code style, PR process, and perf guidelines.
- [Lighthouse CI Report](https://github.com/yourorg/robo-multipost/actions/workflows/lighthouse.yml) - Automated perf audits.

## Repository Starting Points

- **`src/app/`** - Next.js app router; focus on page layouts, loading states, and suspense for perf waterfalls.
- **`src/components/`** - UI components (e.g., shared/PostFeed, UserAvatar); profile for re-renders and memoization.
- **`src/lib/`** - Core utils (utils.ts, avatar.ts, timezones.ts); optimize pure functions and caching.
- **`public/`** - Static assets; ensure images are optimized (WebP/AVIF).
- **`tests/`** - Performance test suites; extend with render timing assertions.

## Key Files

- **`src/lib/utils.ts`** - `cn` class merger; ensure stable inputs to prevent style recalc thrashing.
- **`src/lib/avatar.ts`** - `getAvatarUrl`, `getRandomAvatarStyle`; add memoization and lazy loading hooks.
- **`src/lib/timezones.ts`** - Heavy Intl usage (`formatInTimezone`, `getUserTimezone`); cache offsets, batch formats.
- **`next.config.js`** - Bundle analyzer config, SWC/ESBuild tweaks, image optimization domains.
- **`tailwind.config.js`** - Purge unused classes to shrink CSS bundle.
- **`package.json`** - Deps like `next`, `swr`; suggest perf add-ons (e.g., `next-offline`).
- **`src/components/shared/`** - Reusable UI; apply `React.memo` universally.

## Architecture Context

- **Utils Layer (`src/lib`, `src/components/shared`)**: 10+ key exports (e.g., `cn`, `AvatarStyle`, `formatInTimezone`). Pure functions dominate; ~5 heavy computations (Intl, URL gen). Focus: memoize exports, export memoized versions.
- **Components Layer (`src/components/`)**: 50+ components inferred; shared utils used widely. Patterns: Tailwind, hooks-heavy. Optimize: lists, avatars in feeds.
- **App Router (`src/app/`)**: Pages with parallel routes/suspense. Ensure streaming, no blocking renders.

## Key Symbols for This Agent

- **`cn`** (`src/lib/utils.ts:4`): Tailwind merger; audit callers for unstable objects.
- **`getAvatarUrl`** (`src/lib/avatar.ts:25`): Image src gen; wrap in `useMemo`.
- **`formatInTimezone`** (`src/lib/timezones.ts:138`): Date formatting; cache per-tz/per-date.
- **`getUserTimezone`** (`src/lib/timezones.ts:64`): Detect fn; singleton/context.
- **`AvatarStyle`** (`src/lib/avatar.ts:7`): Enum; optimize switch in renders.

## Documentation Touchpoints

- **`docs/PERFORMANCE.md`** - Existing perf guidelines, bundle analysis setup.
- **`src/lib/timezones.ts`** - Inline docs on Intl fallbacks and caching.
- **`README.md`** - Lighthouse targets and perf monitoring setup.
- **`tests/performance/`** - Test utils for render timing.

## Collaboration Checklist

- [ ] Confirm perf issue with metrics (Lighthouse, Profiler trace).
- [ ] Baseline current perf: bundle size, LCP/CLS/FID.
- [ ] Scan codebase: `searchCode` for un-memoized lists, `analyzeSymbols` on utils.
- [ ] Propose changes in PR with before/after metrics.
- [ ] Review with Frontend agent; test on low-end devices.
- [ ] Update docs/PERFORMANCE.md with new patterns.
- [ ] Capture learnings in AGENTS.md perf section.

## Hand-off Notes

After optimization: Provide diff with metrics delta (e.g., "Bundle -15%, LCP -40%"). Risks: Over-memoization causing stale data—add `React.memo` equality fns. Follow-up: Integrate perf budget enforcement in CI; monitor prod with Vercel Analytics.

## Related Resources

- [../docs/README.md](./../docs/README.md)
- [README.md](./README.md)
- [../../AGENTS.md](./../../AGENTS.md)
- [../frontend-agent/README.md](./../frontend-agent/README.md)
- [PERFORMANCE.md](../docs/PERFORMANCE.md)
