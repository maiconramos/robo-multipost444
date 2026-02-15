```markdown
# Testing Strategy

Quality in the Robo-Multipost codebase is maintained through a layered testing approach emphasizing fast unit tests for core logic, integration tests for API and hook interactions, and selective E2E tests for critical user flows. We prioritize high coverage on business-critical modules like hooks (`src/hooks/*`), utilities (`src/lib/*`), and components (`src/components/*`). Tests are run in CI/CD pipelines as quality gates, enforcing coverage thresholds and linting. Mocking is used extensively for external APIs (e.g., Late API client) to ensure deterministic tests. Test files follow naming conventions and are colocated with source files where possible.

Cross-reference: [Development Workflow](../development-workflow.md) for setup and pre-commit hooks.

## Test Types

- **Unit**: Vitest (with Vite for fast execution), files named `*.test.ts` or `*.spec.ts` colocated next to source files (e.g., `use-queue.test.ts` alongside `use-queue.ts`). Uses `vi.mock()` for dependencies, focuses on pure functions, hooks, and utils. Required: `@vitest/ui`, `jsdom` for DOM simulation.
- **Integration**: Vitest + MSW (Mock Service Worker) for API mocking, files named `*.integration.test.ts`. Tests hook compositions, API routes (e.g., `/api/validate-key`), and component rendering with real data flows. Scenarios include account connections, post creation/queueing, and media uploads.
- **E2E**: Playwright, files in `e2e/*.spec.ts`. Covers key user journeys like dashboard compose → schedule → queue, account OAuth callbacks. Uses `playwright.config.ts` with headless mode; environments: local dev server or staging. Harnesses: custom fixtures for auth and profiles.

No snapshot tests; prefer explicit assertions. Mock external services like Late API via `src/lib/late-api/client.ts` intercepts.

## Running Tests

- All tests: `npm run test`
- Watch mode: `npm run test:watch`
- Coverage: `npm run test:coverage`
- UI mode (Vitest): `npm run test:ui`
- E2E: `npx playwright test`
- E2E UI: `npx playwright test --ui`
- Update E2E snapshots: `npx playwright test --update-snapshots`

Example for focused runs:
```bash
# Unit tests for hooks only
npm run test -- src/hooks/

# Specific file with coverage
npm run test -- src/hooks/use-queue.test.ts --coverage
```

## Quality Gates

- **Coverage**: 85% statements/branches minimum overall; 90%+ for `src/hooks/` and `src/lib/`. Enforced via `vitest --coverage --coverage-threshold`.
- **Linting/Formatting**: `npm run lint` (ESLint + Prettier) must pass; husky pre-commit hook.
- **TypeScript**: `npm run typecheck` (strict mode) before merge.
- **CI Checks**: GitHub Actions runs full suite; PRs blocked on failures. No merges without passing tests.
- **Flake Detection**: Retry failing tests up to 2x in CI; log JUnit for analysis.

## Troubleshooting

- **Flaky E2E**: Network-dependent OAuth callbacks—use MSW or skip in CI with tags (`@skip-ci`). Queue timing assertions can vary; use `waitFor` with generous timeouts.
- **Long-running Tests**: Media upload suites (`use-media.ts`)—mock presign/ uploads. Run with `--shard` in CI.
- **Environment Quirks**: Ensure DB/auth/encryption env vars are set (`DATABASE_URL`, `BETTER_AUTH_*`, `ENCRYPTION_KEY`). Per-account publishing secrets must be inserted through account credential APIs/fixtures, not env vars. Vitest jsdom warnings? Update `@testing-library` deps. Playwright on Apple Silicon: use `arm64` channel in config.
- **Debug Tip**: `vitest --inspect` or Playwright inspector (`--headed --debug`).

## Related Resources

- [Development Workflow](./development-workflow.md)
```
