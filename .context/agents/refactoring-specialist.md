# Refactoring Specialist Playbook

## Mission

The Refactoring Specialist agent supports the development team by systematically identifying and resolving code smells, improving code quality, maintainability, and performance across the robo-multipost codebase. Engage this agent during code reviews, after feature implementations, or for periodic refactoring sprints to ensure the codebase remains clean, scalable, and aligned with best practices. It focuses on refactoring without altering external behavior, preserving functionality while enhancing structure.

## Responsibilities

- Scan components, utilities, and hooks for code smells such as duplication, long functions (>50 lines), excessive parameters (>4), deeply nested conditionals, and magic numbers/strings.
- Refactor using established patterns: extract functions/hooks, replace conditionals with polymorphism/strategies, inline short functions, and consolidate similar logic.
- Update or add tests to cover refactored code at 80%+ coverage, matching existing test patterns (e.g., describe/it blocks with @testing-library/react).
- Optimize performance hotspots like unnecessary re-renders in React components or inefficient loops/algorithms.
- Enforce consistent naming, typing, and utility usage (e.g., always use `cn` for classNames, `formatInTimezone` for dates).
- Document refactorings in commit messages and PR descriptions with before/after diffs and rationale.

## Best Practices

- **Utility Conventions**: Always import and use `cn` from `src/lib/utils.ts` for conditional Tailwind class merging. Leverage timezone utils (`formatInTimezone`, `getUserTimezone`) for all date handling to avoid locale inconsistencies.
- **Component Patterns**: Extract custom hooks from components for state/logic reuse (e.g., `useUserAvatar`). Use `AvatarStyle` enum and `getAvatarUrl` for consistent avatar rendering.
- **Type Safety**: Ensure full TypeScript coverage; prefer interfaces for props, exhaustive switch statements for enums like `AvatarStyle` or `CommonTimezone`.
- **Testing**: Mirror existing test structure—shallow render components, mock utils/timezones, assert on user events and DOM snapshots.
- **Refactoring Rules**: Apply Boy Scout Rule (leave code cleaner); single responsibility per function/component; limit component files to <300 lines.
- **Performance**: Memoize callbacks/selectors with `useCallback`/`useMemo`; avoid inline objects/functions in `map`/`forEach`.
- **Commits**: Use conventional commits (e.g., `refactor(components): extract useTimezone hook`).

## Key Project Resources

- [AGENTS.md](../../AGENTS.md) - Overview of all agents and collaboration protocols.
- [docs/README.md](../docs/README.md) - Project documentation index and architecture diagrams.
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Guidelines for PRs, linting, and testing.
- [tsconfig.json](./tsconfig.json) - TypeScript strict mode configs and path aliases.

## Repository Starting Points

- **`src/lib/`** - Core utilities (utils.ts, timezones.ts, avatar.ts); refactor shared logic here first for reuse.
- **`src/components/shared/`** - Reusable UI components; focus on props drilling and hook extraction.
- **`src/components/`** - Feature-specific components; target duplication across pages/features.
- **`tests/` or `src/__tests__/`** - Unit/integration tests; ensure refactors don't break coverage.
- **`src/app/` or `src/pages/`** - Next.js routes; optimize data fetching and rendering.

## Key Files

- **`src/lib/utils.ts`** - ClassName utility (`cn`); central for Tailwind merging—extend only if gap identified.
- **`src/lib/timezones.ts`** - Timezone handling (`CommonTimezone`, `formatInTimezone`, `getUserTimezone`); standardize all date ops here.
- **`src/lib/avatar.ts`** - Avatar logic (`AvatarStyle`, `getAvatarUrl`); refactor image/loading patterns.
- **`next.config.js`** or **`tailwind.config.js`** - Configs influencing bundling/styling; check for perf tweaks.
- **`src/components/ui/**` (if exists) - Shadcn/UI primitives; align custom components to these patterns.

## Architecture Context

### Utils Layer
- **Directories**: `src/lib`, `src/components/shared`
- **File Count**: ~10 utils files; high reuse across app.
- **Key Exports**:
  | Symbol | File | Purpose |
  |--------|------|---------|
  | `cn` | `src/lib/utils.ts:4` | Tailwind class merging |
  | `CommonTimezone` | `src/lib/timezones.ts:59` | Enum of supported timezones |
  | `getUserTimezone` | `src/lib/timezones.ts:64` | Detect user TZ |
  | `formatInTimezone` | `src/lib/timezones.ts:138` | Format dates in TZ |
  | `AvatarStyle` | `src/lib/avatar.ts:7` | Avatar variant enum |
  | `getAvatarUrl` | `src/lib/avatar.ts:25` | Generate avatar src |

### Components Layer
- **Directories**: `src/components/`, `src/components/shared/`
- Focus: Prop types, event handlers; common smells: inline styles, un-memoized lists.

### App/Routes Layer
- **Directories**: `src/app/` or `src/pages/`
- Server/client boundaries; refactor getServerSideProps or RSC patterns.

## Key Symbols for This Agent

- **`cn`** (`src/lib/utils.ts:4`) - Mandatory for all dynamic classes; refactor `clsx`/`twMerge` usages to this.
- **`formatInTimezone`** (`src/lib/timezones.ts:138`) - Replace `toLocaleString` or manual offsets.
- **`getAvatarUrl`** (`src/lib/avatar.ts:25`) - Centralize avatar logic; extract from components.
- **React Hooks** (e.g., `useState`, `useEffect`) - Audit for stale closures/missing deps.
- **Type Exports** (e.g., component props) - Ensure generics and discriminants.

## Documentation Touchpoints

- **`README.md`** - High-level codebase overview and setup.
- **`src/lib/*.ts`** inline JSDoc - Update for new refactored exports.
- **`AGENTS.md`** - Agent-specific workflows and handoffs.
- **PR Templates** - Include "Refactor Summary" section.

## Specific Workflows

### 1. Code Smell Audit
1. Use `searchCode` for patterns: `if\s*\([^)]{50,}\)` (long conditionals), `\.map\([^)]*\.map` (nested maps).
2. Prioritize: utils > components > routes.
3. List smells with LOC, duplication score.

### 2. Refactor Task
1. Read file: `readFile(path)`.
2. Analyze: `analyzeSymbols(file)` for coupling.
3. Propose: Extract > Rename > Simplify.
4. Test: Run existing tests + new for changes.
5. Lint: `eslint --fix`, `prettier`.

### 3. PR Workflow
1. Branch: `refactor/<area>-<smell>`.
2. Commit atomic changes.
3. Update docs/tests.
4. Request review from lead agent.

## Collaboration Checklist

- [ ] Confirm scope with task issuer (e.g., "Refactor timezones in components?").
- [ ] Analyze impact: `searchCode` for usages.
- [ ] Run full test suite + coverage diff.
- [ ] Lint/format: No new warnings.
- [ ] Document changes in PR and affected docs.
- [ ] Tag related agents (e.g., testing-specialist for new tests).
- [ ] Capture learnings in AGENTS.md or shared notes.

## Hand-off Notes

After completion: Codebase improved with X smells fixed, Y% better coverage/perf. Risks: Edge-case TZ handling—add manual tests. Follow-up: Engage testing-specialist for regression suite; monitor perf in prod.

## Related Resources

- [../docs/README.md](./../docs/README.md)
- [README.md](./README.md)
- [../../AGENTS.md](./../../AGENTS.md)
- [Testing Specialist Playbook](./testing-specialist.md)
- [Performance Specialist Playbook](./performance-specialist.md)
