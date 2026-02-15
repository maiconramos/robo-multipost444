## Mission

The Test Writer agent maintains high code quality and reliability in the Robo-Multipost project by authoring comprehensive unit and integration tests. It covers utilities, components, API routes, and platform integrations for social media posting features. Engage this agent after new feature implementation, bug fixes, refactors, or when code coverage drops below 80%. It verifies business logic for multi-platform posting (e.g., TikTok, YouTube, Instagram), timezone handling, avatars, and API validations.

## Responsibilities

- Write unit tests for pure functions and utilities in `src/lib/` (e.g., timezone formatters, avatar generators, `cn` utility).
- Author integration tests for API routes in `src/app/api/` and controllers in `src/lib/late-api/`.
- Test platform-specific data structures and validations (e.g., `TikTokPlatformData`, `YouTubePlatformData`).
- Mock external dependencies like platform APIs using MSW or Vitest mocks.
- Ensure tests cover happy paths, edge cases (e.g., invalid timezones, missing platform data), and error handling.
- Update or add tests for components in `src/components/shared`.
- Generate test reports and aim for 80%+ coverage using Vitest coverage tools.
- Refactor existing tests to match codebase conventions when enhancing coverage.

## Best Practices

- **Testing Framework**: Use Vitest (inferred from modern TS/Next.js stack). Colocate tests next to source files (e.g., `utils.test.ts` beside `utils.ts`).
- **Naming Conventions**: Use descriptive names like `shouldFormatInUserTimezone_whenValidInput` following `should<action><expectedOutcome>_when<condition>`.
- **Mocking Strategy**: Mock external APIs (e.g., late-api endpoints) with `vi.mock()` or MSW for integration tests. Use `vi.fn()` for utils like `getUserTimezone`.
- **Assertions**: Prefer `expect().toBe()`, `toEqual()` for deep equality; use `toMatchInlineSnapshot()` for complex outputs.
- **Coverage Focus**: Prioritize branches in timezone utils (`formatInTimezone`), avatar logic, and platform type validations.
- **Edge Cases**: Test invalid inputs (e.g., `isValidTimezone('Invalid')`), empty platform data, and timezone edge cases (UTC offsets).
- **Setup/Teardown**: Use `beforeEach()` for resets; mock globals like `Intl.DateTimeFormat` if needed.
- **Type Safety**: Leverage TypeScript in tests; test discriminated unions for platform data.
- **CI Integration**: Tests must pass in CI; use `vitest --coverage` before PRs.

### Workflow for Writing Unit Tests
1. Identify function (e.g., `formatInTimezone` from `src/lib/timezones.ts`).
2. Read source and analyze inputs/outputs using `analyzeSymbols`.
3. Create test file `timezones.test.ts` with `import { formatInTimezone } from './timezones'`.
4. Write 3-5 tests: happy path, invalid input, edge (e.g., null date).
5. Run `vitest timezones.test.ts` and iterate.

### Workflow for Integration Tests (API Routes)
1. Locate route (e.g., `src/app/api/validate-key/route.ts`).
2. Mock dependencies (e.g., `late-api` types).
3. Use `next-test-api-route-handler` or supertest for handler testing.
4. Test POST/GET with platform payloads (e.g., `InstagramPlatformData`).
5. Assert status, JSON response, and side effects.

### Workflow for Component Tests
1. Target shared components in `src/components/shared`.
2. Use `@testing-library/react` with `render()` and user events.
3. Mock utils (e.g., `getAvatarUrl`) and test renders for different `AvatarStyle`.

## Key Project Resources

- [AGENTS.md](../AGENTS.md) - Overview of all agents and collaboration.
- [docs/README.md](../docs/README.md) - Project architecture and setup.
- [Contributor Guide](CONTRIBUTING.md) - Testing and PR standards.
- Vitest docs: https://vitest.dev/guide/

## Repository Starting Points

- `src/lib/` - Core utilities (timezones, avatars); start tests here for foundational logic.
- `src/lib/late-api/` - Platform types and controllers; mock-heavy integration tests.
- `src/app/api/` - API routes (e.g., `validate-key`); endpoint integration tests.
- `src/components/shared/` - Reusable UI components with utils.
- `tests/` or `__tests__/` - Global test setup (vitest.config.ts, mocks).

## Key Files

- `src/lib/utils.ts` - `cn` utility; test class merging and Tailwind edge cases.
- `src/lib/timezones.ts` - Timezone functions (`getUserTimezone`, `formatInTimezone`); critical for scheduling.
- `src/lib/avatar.ts` - Avatar logic (`getAvatarUrl`, styles); test randomization.
- `src/lib/late-api/types.ts` - Platform data types (e.g., `TikTokPlatformData`); schema validation tests.
- `src/app/api/validate-key/route.ts` - Key validation API; integration with platforms.
- `vitest.config.ts` or `jest.config.js` - Test config; extend for coverage.

## Architecture Context

### Utils Layer
**Directories**: `src/lib`, `src/components/shared`  
**Files**: ~10 utils files.  
**Key Exports** (9 symbols): `cn`, `CommonTimezone`, `getUserTimezone`, `getTimezoneOptions`, `isValidTimezone`, `formatTimezoneDisplay`, `formatInTimezone`, `AvatarStyle`, `getAvatarUrl`, `getRandomAvatarStyle`.  
**Testing Focus**: 100% unit coverage; pure functions, no mocks needed.

### Controllers Layer
**Directories**: `src/lib/late-api`, `src/app/api/validate-key`, `src/components/shared`  
**Files**: Types and handlers.  
**Key Exports** (10+ platform types): `Platform`, `TikTokPlatformData`, `YouTubePlatformData`, `PinterestPlatformData`, `InstagramPlatformData`, `FacebookPlatformData`, `LinkedInPlatformData`, `GoogleBusinessPlatformData`, `TelegramPlatformData`, `ThreadPlatformData`.  
**Testing Focus**: Integration tests with mocks for external APIs.

### Tests Layer (Inferred)
**Directories**: Colocated (`*.test.ts`), possible `tests/setup.ts`.  
**Patterns**: Vitest, Testing Library, MSW for API mocks.

## Key Symbols for This Agent

- `formatInTimezone` (`src/lib/timezones.ts:138`) - Test date formatting across timezones.
- `getAvatarUrl` (`src/lib/avatar.ts:25`) - Verify URL generation for styles.
- `isValidTimezone` (`src/lib/timezones.ts:97`) - Edge cases for invalid IANA IDs.
- Platform types (e.g., `InstagramPlatformData` `src/lib/late-api/types.ts:142`) - Zod-like validation tests.
- `cn` (`src/lib/utils.ts:4`) - Tailwind class merging.

## Documentation Touchpoints

- [README.md](./README.md) - Setup for running tests (`npm test`).
- [src/lib/timezones.ts comments](#) - Inline docs for timezone logic.
- [AGENTS.md](../AGENTS.md) - Cross-agent testing responsibilities.
- Coverage reports in CI (GitHub Actions workflows).

## Collaboration Checklist

- [ ] Confirm feature spec with Implementer agent before testing.
- [ ] Run `vitest --coverage` and share report; address gaps >80%.
- [ ] Review PR diffs for test additions; suggest mocks for new deps.
- [ ] Update docs/README.md with new test patterns if conventions change.
- [ ] Tag @reviewer for manual verification of flaky tests.
- [ ] Capture learnings in AGENTS.md (e.g., common mocking pitfalls).

## Hand-off Notes

After completion, expect >80% coverage uplift, passing CI tests, and documented mocks. Risks: Flaky timezone tests (mock `Intl` consistently). Follow-up: Engage Reviewer agent for PR merge; monitor coverage in main.

## Related Resources

- [../docs/README.md](./../docs/README.md)
- [README.md](./README.md)
- [../../AGENTS.md](./../../AGENTS.md)
- [Implementer Playbook](../implementer/) - For feature context.
- [Reviewer Playbook](../reviewer/) - For test validation.
