## Development Workflow

The development process for Robo-Multipost follows a streamlined GitHub Flow model to keep iterations fast and collaborative. Start by identifying a task from the GitHub issues board (prioritize labels like `good first issue` or `bug`). Create a feature branch from `main`, implement changes using the provided hooks (e.g., `usePosts`, `useAccounts`, `useQueueSlots`) and components (e.g., dashboard pages in `src/app/dashboard`). Run local development server to test UI interactions, API calls via `createLateClient`, and features like post scheduling or account health checks.

Write unit/integration tests referencing the [testing-strategy.md](./testing-strategy.md). Ensure TypeScript compliance, linting, and no console errors. Commit with conventional commit messages (e.g., `feat: add queue slot normalization`). Push and open a PR with a clear description, screenshots/GIFs for UI changes, and checkboxes for self-review (lint, tests, docs). After approval and automated checks pass, merge via squash/rebase. Post-merge, monitor production via Vercel dashboard or integrated logging.

For hotfixes, branch from `main` with `hotfix/<issue>`. See [tooling.md](./tooling.md) for editor setup (VS Code with Tailwind/TS extensions recommended).

## Branching & Releases

- **Main branch (`main`)**: Always deployable/production-ready. Trunk-based development—no long-lived branches.
- **Feature branches**: `feature/<jira-ticket-or-description>` or `feat/<short-name>` (e.g., `feature/add-tiktok-support`). Branch from `main`, keep PRs small (<400 lines).
- **Bugfix branches**: `fix/<short-description>` or `hotfix/<issue-number>`.
- **Release process**: 
  - Merge PRs to `main` triggers auto-deploy (Vercel/Netlify).
  - For tagged releases: `git tag v<major>.<minor>.<patch>` (semantic versioning), `git push --tags`.
  - Cadence: Weekly minors on merge volume; majors on breaking changes (e.g., API migrations).
- **PR conventions**: Use draft PRs for WIP; require linked issue, changelog entry if user-facing.
- No `develop` or Git Flow—keep it simple.

## Local Development

- **Prerequisites**: Node.js 18+, Git, pnpm (preferred) or npm.
- **Clone & Install**:
  ```
  git clone https://github.com/<org>/robo-multipost.git
  cd robo-multipost
  pnpm install  # or npm install
  ```
- **Run Development Server** (with hot reload, Tailwind JIT):
  ```
  pnpm dev  # or npm run dev
  ```
  Open http://localhost:3000. Test dashboard flows (compose, queue, accounts).
- **Build for Production**:
  ```
  pnpm build  # or npm run build
  pnpm start  # preview production build
  ```
- **Lint & Format**:
  ```
  pnpm lint  # ESLint + Prettier
  ```
- **Type Check**:
  ```
  pnpm tsc --noEmit
  ```
- **Test** (Jest/Vitest + React Testing Library):
  ```
  pnpm test
  pnpm test:watch
  ```
- **Environment**: Copy `.env.example` to `.env.local`, add API keys (e.g., Late API, NextAuth). See `src/lib/late-api/client.ts` for client setup.

## Code Review Expectations

PRs must pass CI (lint, types, tests >80% coverage). Self-review first: Does it use existing hooks (e.g., `useAccounts`, `useMediaPresign`)? Update types/interfaces? Add docs for new exports? Check accessibility (ARIA on UI components like `PlatformIcon`), security (no exposed keys), and performance (memoize hooks, optimistic updates).

Reviewers (at least 1 approval): Verify functionality against Figma/spec, test edge cases (e.g., invalid media types via `isValidMediaType`), scan for regressions in queue/calendar views. Approve if checklist passes:
- ✅ Tests added/updated
- ✅ Types don't error
- ✅ No merge conflicts
- ✅ Docs updated (e.g., new props in components)

For agent collaboration (e.g., Copilot, Cursor), follow AGENTS.md guidelines: prompt for hook usage examples, diff reviews. Re-review AI-generated code manually.

## Onboarding Tasks

New contributors:
1. Set up local env (above commands) and connect a test account via dashboard/accounts.
2. Browse issues labeled `good-first-issue` or `help wanted` on GitHub.
3. Starter tickets: Fix small UI polish (e.g., avatar rendering with `getAvatarUrl`), add tests for `formatQueueSlot`, or document a hook.
4. Runbooks: [Vercel dashboard](https://vercel.com) for deploys; Late API docs for platform data schemas.
5. Slack #dev-workflow for questions.

## Related Resources

- [testing-strategy.md](./testing-strategy.md)
- [tooling.md](./tooling.md)
