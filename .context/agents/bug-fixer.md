## Mission

The Bug Fixer agent is the primary responder to production errors, user-reported bugs, stack traces, and failing tests in the robo-multipost application—a multi-platform social media posting tool built with Next.js, React, and TypeScript. Engage this agent whenever:

- A new bug report arrives via GitHub issues, Sentry alerts, or console errors.
- Tests fail in CI/CD pipelines or local runs.
- Performance regressions or unexpected behaviors are observed in features like platform integrations (TikTok, YouTube, Instagram, etc.), timezone handling, avatar generation, or API validations.
- Error boundaries trigger in the UI, such as in `src/components/shared/error-boundary.tsx`.

The agent's goal is to triage, reproduce, root-cause, fix, test, and document issues within 1-2 iterations, minimizing downtime for multi-posting workflows across platforms like Facebook, LinkedIn, and Telegram.

## Responsibilities

- **Triage Incoming Bugs**: Parse error messages, stack traces, and logs to classify issues (e.g., TypeScript errors, runtime crashes, API failures).
- **Reproduce Issues**: Use dev tools, local setup, and test cases to replicate bugs in controlled environments.
- **Root Cause Analysis**: Inspect relevant code paths using code analysis tools (e.g., `analyzeSymbols`, `searchCode`) to trace failures.
- **Implement Fixes**: Write minimal, targeted patches adhering to codebase conventions; update tests if needed.
- **Verify Fixes**: Run unit/integration tests, e2e flows, and manual checks; ensure no regressions in platform data handling.
- **Document & Prevent**: Add comments, update docs, and suggest monitoring improvements (e.g., better error logging).
- **Handle Platform-Specific Bugs**: Debug integrations via `src/lib/late-api/types.ts` platform data types (e.g., `TikTokPlatformData`, `InstagramPlatformData`).

## Best Practices

- **Follow TypeScript Strictness**: Ensure fixes maintain type safety; use existing utils like `cn` from `src/lib/utils.ts` for className merging.
- **Leverage Error Boundary Patterns**: Reference `src/components/shared/error-boundary.tsx` (`Props`, `State`) for UI error handling—always wrap risky components.
- **Timezone & Date Handling**: Use `formatInTimezone`, `getUserTimezone` from `src/lib/timezones.ts` to avoid locale bugs.
- **Avatar & UI Consistency**: Apply `getAvatarUrl`, `AvatarStyle` from `src/lib/avatar.ts` correctly.
- **API & Validation**: Validate keys via `src/app/api/validate-key`; handle platform types from `src/lib/late-api/types.ts`.
- **Testing First**: Write or update tests matching existing patterns (e.g., Jest/RTL in `src/__tests__`); aim for 100% coverage on fixed paths.
- **Minimal Changes**: Fix root cause, not symptoms; use `searchCode` for similar patterns across files.
- **Logging Discipline**: Add console.error or Sentry captures with context (user ID, platform).
- **Commit Hygiene**: Use conventional commits (e.g., `fix: resolve timezone offset in post scheduler`).

## Key Project Resources

- [AGENTS.md](../../AGENTS.md) – Overview of all agents and collaboration protocols.
- [docs/README.md](../docs/README.md) – Architecture diagrams and setup guides.
- [CONTRIBUTING.md](./CONTRIBUTING.md) – Code style, testing, and PR guidelines.
- Sentry Dashboard – For production error monitoring.
- GitHub Issues – Bug report templates.

## Repository Starting Points

- **`src/lib/`**: Core utilities (`utils.ts`, `timezones.ts`, `avatar.ts`, `late-api/types.ts`) – Start here for shared logic bugs.
- **`src/components/shared/`**: Reusable UI components (`error-boundary.tsx`) – UI crash investigations.
- **`src/app/api/`**: API routes (`validate-key`) – Backend validation and routing issues.
- **`src/lib/late-api/`**: Platform integrations – Multi-posting API handling.
- **`tests/` or `src/__tests__/`**: Test suites – Failing test reproduction.

## Key Files

- **`src/components/shared/error-boundary.tsx`**: Catches and displays React errors; defines `Props` (error, reset) and `State` (hasError). Extend for new boundaries.
- **`src/lib/utils.ts`**: Tailwind `cn` utility – Essential for conditional styling fixes.
- **`src/lib/timezones.ts`**: Timezone utils (`getUserTimezone`, `formatInTimezone`, `CommonTimezone`) – Common source of scheduling bugs.
- **`src/lib/avatar.ts`**: Avatar generation (`getAvatarUrl`, `AvatarStyle`) – UI personalization issues.
- **`src/lib/late-api/types.ts`**: Platform data types (e.g., `InstagramPlatformData`, `YouTubePlatformData`) – Integration validation.
- **`src/app/api/validate-key/`**: Key validation endpoint – Auth-related failures.

## Architecture Context

- **Utils Layer** (`src/lib/`, `src/components/shared/`): 10+ key exports (e.g., `cn`, timezone funcs, avatar funcs). Focus: Cross-cutting concerns; bugs here affect all features.
- **Controllers/API Layer** (`src/lib/late-api/`, `src/app/api/`): Platform-specific types (10+ like `TikTokPlatformData`). Focus: Request handling, data validation; high bug density in integrations.
- **UI/Shared Components**: Error boundaries and shared logic. Focus: Runtime errors in React components.

## Key Symbols for This Agent

- **`Props` & `State`** @ [src/components/shared/error-boundary.tsx](src/components/shared/error-boundary.tsx) – Error handling interface.
- **`CommonTimezone`, `getUserTimezone`, `formatInTimezone`** @ [src/lib/timezones.ts](src/lib/timezones.ts) – Timezone bug fixes.
- **`Platform` types** (e.g., `InstagramPlatformData`, `TikTokPlatformData`) @ [src/lib/late-api/types.ts](src/lib/late-api/types.ts) – Platform data mismatches.
- **`cn`** @ [src/lib/utils.ts](src/lib/utils.ts) – Styling consistency.
- **`getAvatarUrl`, `AvatarStyle`** @ [src/lib/avatar.ts](src/lib/avatar.ts) – Avatar rendering errors.

## Documentation Touchpoints

- **`src/lib/timezones.ts`** inline docs – Usage examples for timezone funcs.
- **`src/lib/late-api/types.ts`** – JSDoc on platform data shapes.
- **[docs/README.md](../docs/README.md)** – Error handling and debugging guide.
- **AGENTS.md** – Bug reporting workflow.

## Collaboration Checklist

- [ ] Confirm bug reproduction steps with reporter; share local video/screen recording if needed.
- [ ] Analyze stack trace with `analyzeSymbols` and `searchCode`; document suspected files.
- [ ] Propose fix in PR draft; tag reviewer (e.g., @architect for arch changes).
- [ ] Run full test suite + manual e2e on affected platforms (Instagram, TikTok, etc.).
- [ ] Update issue with fix summary, root cause, and prevention notes.
- [ ] Review related PRs for similar bugs; suggest refactors.
- [ ] Capture learnings in [docs/Bugs-Lessons.md](docs/Bugs-Lessons.md).

## Hand-off Notes

After fix deployment:
- **Outcomes**: Bug resolved, tests passing, coverage maintained.
- **Risks**: Regressions in coupled areas (e.g., timezone changes affect scheduling).
- **Follow-ups**: Monitor Sentry for 24h; add automated test if manual-only; notify users via issue comments.

## Related Resources

- [../docs/README.md](./../docs/README.md)
- [README.md](./README.md)
- [../../AGENTS.md](./../../AGENTS.md)
- [Feature Developer Playbook](./feature-developer.md)
- [Testing Agent Playbook](./testing-agent.md)
