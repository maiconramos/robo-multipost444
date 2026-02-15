# Setup Guide - Robô MultiPost

Guia para desenvolvimento local e deploy em produção com **1 único projeto no Cloudflare**.

## Pré-requisitos

- Node.js 20+
- pnpm 10.29.3+
- PostgreSQL (Neon recomendado)
- Conta Cloudflare (produção)

## 1) Desenvolvimento Local

```bash
git clone https://github.com/maiconramos/robo-multipost.git
cd robo-multipost
pnpm install
cp .env.example .env.local
```

Configure no `.env.local` (mínimo):

```bash
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"
ENCRYPTION_KEY="$(openssl rand -hex 32)"
BETTER_AUTH_SECRET="$(openssl rand -base64 32)"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
CRON_SECRET="$(openssl rand -base64 32)"
```

Prisma:

```bash
npx prisma generate
npx prisma db push
```

Rodar app:

```bash
pnpm dev:web
# http://localhost:3000
```

## 2) Produção no Cloudflare (1 deploy)

Esse monorepo publica **somente `apps/web`** como Worker OpenNext.

No Cloudflare (Workers & Pages → Connect to Git), configure:

| Campo | Valor |
|---|---|
| Project name | `robo-multipost` |
| Build command | `pnpm run build` |
| Deploy command | `pnpm run deploy` |
| Non-production branch deploy command | `pnpm run deploy:preview` |
| Path | `/` |

### Variáveis obrigatórias (Cloudflare)

- `DATABASE_URL`
- `ENCRYPTION_KEY`
- `BETTER_AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL` (ou `BETTER_AUTH_URL`)
- `CRON_SECRET`

### Storage (default Cloudflare R2)

Se `STORAGE_PROVIDER` não for preenchido, o app usa `CLOUDFLARE_R2`.

Configure:

- `CF_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_URL` (opcional)
- `CF_API_TOKEN` (opcional para endpoint de métricas de uso)

## 3) Comandos de Build/Deploy

Na raiz do repositório:

```bash
pnpm run build
pnpm run deploy
```

Alternativa equivalente:

```bash
npx wrangler deploy
```

Preview:

```bash
pnpm run deploy:preview
```

## 4) Cron automático de publicação

Endpoint: `POST /api/cron/process`

Header:

```http
Authorization: Bearer <CRON_SECRET>
```

Workflow incluso no repo:

- `.github/workflows/cron-process.yml`
- Secrets necessários:
  - `CRON_ENDPOINT_URL` (ex.: `https://robo-multipost.<seu-subdominio>.workers.dev/api/cron/process`)
  - `CRON_SECRET`

Observação: GitHub Actions agenda com granularidade de 5 minutos.

## 5) Comandos úteis

```bash
pnpm dev
pnpm dev:web
pnpm build
pnpm build:turbo
pnpm deploy
pnpm deploy:preview
pnpm lint
pnpm typecheck
```

Banco:

```bash
npx prisma generate
npx prisma db push
npx prisma migrate dev --name <nome>
npx prisma migrate deploy
npx prisma studio
```

## 6) Estrutura do projeto

```text
robo-multipost/
├── apps/
│   └── web/
├── packages/
│   ├── auth/
│   ├── db/
│   └── shared/
├── .github/workflows/
│   ├── ci.yml
│   └── cron-process.yml
├── CLOUDFLARE.md
└── .env.example
```

## 7) Troubleshooting

### `The entry-point file at ".open-next/worker.js" was not found`

- O build não foi executado antes do deploy.
- Rode `pnpm run build` e depois `pnpm run deploy`.

### `Unknown storage provider`

- Verifique `STORAGE_PROVIDER`.
- Valores válidos: `CLOUDFLARE_R2`, `VERCEL_BLOB`, `S3_COMPAT`, `URL_ONLY`.

### Erro de upload no R2

- Confirme `CF_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.

### Cron não processa posts

- Teste manual com `curl` no endpoint `/api/cron/process`.
- Verifique `CRON_SECRET` no Cloudflare e no GitHub Secrets.
