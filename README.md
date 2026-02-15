# Robô MultiPost

**Your social media scheduling wizard.** Schedule posts across 13 platforms with a single interface.

**Live site:** [Robô MultiPost](https://latewiz.com)

![Robô MultiPost Screenshot](./docs/screenshot.png?v=2)

## Features

- 13 platforms (Instagram, TikTok, YouTube, LinkedIn, Pinterest, X/Twitter, Facebook, Threads, Bluesky, Snapchat, Google Business, Reddit, Telegram)
- Visual calendar and smart queue
- Media uploads with pluggable storage backends
- Publishing logs and retry flow
- Public API for integrations
- Multi-tenant workspace model

## Quick Start (Cloudflare - 1 deploy)

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/maiconramos/robo-multipost)

This repo is a monorepo, but production runs as a **single Cloudflare Worker** built from `apps/web`.

1. Create a PostgreSQL database (Neon recommended).
2. Connect the repo in Cloudflare Workers & Pages.
3. Fill build settings:

| Field | Value |
|---|---|
| Project name | `robo-multipost` |
| Build command | `pnpm run build` |
| Deploy command | `pnpm run deploy` |
| Non-production branch deploy command | `pnpm run deploy:preview` |
| Path | `/` |

4. Add environment variables (see `.env.example` and `CLOUDFLARE.md`).
5. Deploy.

Full guide: [CLOUDFLARE.md](CLOUDFLARE.md)

## Local Development

```bash
# 1) Clone

git clone https://github.com/maiconramos/robo-multipost.git
cd robo-multipost

# 2) Install
pnpm install

# 3) Env
cp .env.example .env.local

# 4) Prisma
npx prisma generate
npx prisma db push

# 5) Run app
pnpm dev:web
# http://localhost:3000
```

Detailed setup: [SETUP.md](SETUP.md)

## Scripts

```bash
pnpm dev             # Turbo dev (workspace)
pnpm dev:web         # Next.js local dev
pnpm build           # OpenNext build for Cloudflare
pnpm deploy          # Wrangler deploy (production)
pnpm deploy:preview  # Wrangler versions upload (preview)
pnpm build:turbo     # Legacy monorepo build flow
pnpm lint            # Lint workspace
pnpm typecheck       # Typecheck workspace
```

You can also deploy directly with Wrangler:

```bash
npx wrangler deploy
```

## Environment Variables

Required:

- `DATABASE_URL`
- `ENCRYPTION_KEY`
- `BETTER_AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL` (or `BETTER_AUTH_URL`)
- `CRON_SECRET` (recommended)

Storage defaults:

- `STORAGE_PROVIDER` default is `CLOUDFLARE_R2` when not set.
- For `CLOUDFLARE_R2`, configure: `CF_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.

> **Note:** The "Deploy to Cloudflare" button will help you provision the R2 bucket, but you must still manually generate an R2 API Token and add `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` to your environment variables after deployment.

See `.env.example` for full list.

## Scheduled Publishing

- App endpoint: `POST /api/cron/process`
- Authorization: `Authorization: Bearer <CRON_SECRET>`
- Repo ships with GitHub Actions workflow: `.github/workflows/cron-process.yml`

Note: GitHub scheduled workflows run with 5-minute granularity.

## Tech Stack

- Next.js 16
- React 19
- TypeScript 5
- Prisma + PostgreSQL
- Better Auth
- OpenNext + Wrangler (Cloudflare)
- TanStack Query + Zustand

## Project Structure

```text
robo-multipost/
├── apps/
│   └── web/                 # Frontend + backend API routes (/api/*)
├── packages/
│   ├── auth/
│   ├── db/
│   └── shared/
├── .github/workflows/
│   ├── ci.yml
│   └── cron-process.yml
├── CLOUDFLARE.md
└── SETUP.md
```

## Contributing

Please see [CONTRIBUTING.md](./CONTRIBUTING.md).

## Support

- [GitHub Issues](https://github.com/maiconramos/robo-multipost/issues)
- [Late Documentation](https://docs.getlate.dev)

## License

MIT License - see [LICENSE](./LICENSE).
