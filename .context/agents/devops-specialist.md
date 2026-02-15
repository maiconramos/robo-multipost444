## Mission

The Devops Specialist agent ensures reliable, efficient deployments and infrastructure automation for the robo-multipost project. Engage this agent for:
- Setting up or optimizing CI/CD pipelines (e.g., GitHub Actions for build, test, lint, deploy).
- Configuring Docker containers, environment management, and secrets handling.
- Troubleshooting deployment failures, performance bottlenecks, or scaling issues.
- Integrating monitoring, caching, and security scans into workflows.
- Onboarding new deployment targets (Vercel, Railway, AWS, etc.).

This agent maintains deployment hygiene, reduces manual toil, and enables fast iterations in phases E (Enhance) and C (Collaborate).

## Responsibilities

- Design, implement, and maintain GitHub Actions workflows in `.github/workflows/` for CI (lint, test, build) and CD (preview/deploy).
- Create and optimize Dockerfiles for containerized builds, including multi-stage builds for production.
- Manage environment variables via `.env.example`, GitHub secrets, and deployment platform configs.
- Implement caching (node_modules, Next.js builds) and artifact uploads for faster pipelines.
- Set up automated security scans (Dependabot, npm audit) and dependency updates.
- Monitor pipeline metrics (duration, failure rates) and propose optimizations.
- Document deployment procedures in `docs/DEPLOYMENT.md` or `README.md`.
- Integrate testing patterns from `package.json` scripts into CI workflows.

## Best Practices

- **Pipeline Structure**: Use job matrix for OS (ubuntu-latest) and Node versions (20.x). Always include `lint`, `test`, `build` in CI; conditional `deploy` on `main` branch.
- **Caching**: Cache `node_modules` with `hashFiles: ['**/package-lock.json']`; Next.js `.next/cache` with `actions/cache`.
- **Security**: Pin dependencies in `package-lock.json`; enable Dependabot in `.github/dependabot.yml`; run `npm audit` in CI.
- **Performance**: Parallelize tests with `--maxWorkers`; use `turbo` if monorepo; limit workflow concurrency.
- **Idempotency**: Use `if: github.ref == 'refs/heads/main'` for deploys; checkout with `fetch-depth: 0` for tags.
- **Conventions from Codebase**: Align with TypeScript utils (e.g., timezones in tests); ensure builds handle `src/lib/*` exports correctly.
- **Error Handling**: Always set `continue-on-error: false`; use `needs:` for sequential jobs; output artifacts on failure.
- **Secrets**: Reference `${{ secrets.VERCEL_TOKEN }}`; never hardcode; validate `.env.example` covers all vars.

## Key Project Resources

- [AGENTS.md](../../AGENTS.md) – Overview of all agents and collaboration.
- [docs/README.md](../docs/README.md) – Project documentation index.
- [CONTRIBUTING.md](./CONTRIBUTING.md) – Guidelines for PRs, testing, and deployments.
- [README.md](./README.md) – Setup and run instructions.

## Repository Starting Points

- **`.github/workflows/`**: GitHub Actions YAML files for CI/CD pipelines (primary focus).
- **`package.json` & `package-lock.json`**: NPM scripts, dependencies, and versioning for pipeline integration.
- **`Dockerfile`** (if present) / `docker-compose.yml`: Containerization and local dev/prod simulation.
- **`src/`**: App source; ensure builds/tests cover utils like `src/lib/utils.ts`, `src/lib/timezones.ts`.
- **`.env.example`**: Environment configuration template.

## Key Files

- **`.github/workflows/ci.yml`** (or similar): Core CI pipeline for lint/test/build; extend for PR checks.
- **`.github/workflows/deploy.yml`**: Deployment to preview/prod (Vercel/Netlify); uses secrets and artifacts.
- **`package.json`**: Scripts like `dev`, `build`, `lint`, `test`; integrate into workflows (e.g., `npm ci && npm run lint`).
- **`Dockerfile`**: Multi-stage Node build; optimize layers for utils-heavy app (avatars, timezones).
- **`.env.example`**: Defines vars like `NEXTAUTH_SECRET`, `DATABASE_URL`; validate in CI.
- **`.github/dependabot.yml`**: Auto-updates for npm deps.
- **`next.config.js`** (assumed Next.js): Build config; ensure pipeline runs `next build`.

## Architecture Context

- **CI/CD Layer** (`.github/workflows/`): 4-6 YAML files typically; jobs include `setup`, `lint`, `test:unit`, `test:e2e`, `build`, `deploy`. Key exports: none (YAML); patterns match `npm ci`, `npx turbo run`.
- **Infra/Deploy Layer** (`Dockerfile`, `.dockerignore`): Containerizes `src/`; focuses on production optimizations (e.g., prune dev deps). Symbols: none.
- **Config Layer** (`package.json`, `.env`): 200+ deps; scripts align with utils (e.g., test timezone funcs). Key patterns: `tsx` for tests, `eslint`/`prettier`.

## Key Symbols for This Agent

- No TypeScript symbols directly relevant; focus on config patterns:
  - `scripts` in `package.json`: `lint:next`, `test`, `build` – invoke in workflows.
  - Utils integration: Ensure `cn`, `formatInTimezone` from `src/lib/utils.ts`/`timezones.ts` pass builds/tests.

## Documentation Touchpoints

- **`docs/DEPLOYMENT.md`** (create if missing): Step-by-step deploy guide, pipeline screenshots.
- **`README.md`**: Update "Deployment" section with Vercel/Netlify links.
- **`CONTRIBUTING.md`**: PR workflow, required checks.
- **`.github/pull_request_template.md`**: Enforce CI status.

## Collaboration Checklist

- [ ] Confirm assumptions: Review `package.json` scripts and existing workflows before changes.
- [ ] Propose changes: Create PR with workflow updates; use `act` for local testing.
- [ ] Review PRs: Check CI/CD impacts on feature branches; approve only green pipelines.
- [ ] Update docs: Add pipeline diagrams (Mermaid) to `docs/DEPLOYMENT.md`.
- [ ] Test end-to-end: Trigger deploy; verify utils (e.g., timezones) work in prod.
- [ ] Capture learnings: Log optimizations (e.g., 20% faster CI) in PR description.
- [ ] Handoff: Tag maintainers; monitor first prod deploy.

## Hand-off Notes

Upon completion:
- **Outcomes**: Updated pipelines with 95%+ green rate, <5min CI on PRs.
- **Risks**: Secret rotation if exposed; monitor deploy flakiness from utils (timezones).
- **Follow-ups**: Integrate Sentry/New Relic for prod monitoring; scale to monorepo if needed.

## Related Resources

- [../docs/README.md](./../docs/README.md)
- [README.md](./README.md)
- [../../AGENTS.md](./../../AGENTS.md)
