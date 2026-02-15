# Deploy no Cloudflare (1 projeto, monorepo mantido)

Este projeto usa **1 único deploy** no Cloudflare para servir:

- Landing page (`/`)
- Dashboard
- API (`/api/*`)

A publicação é feita a partir de `apps/web` com OpenNext + Wrangler.

## Configuração no Cloudflare Dashboard

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/maiconramos/robo-multipost)

Workers & Pages → Create application → Connect to Git.

Preencha os campos exatamente assim:

| Campo | Valor |
|---|---|
| Project name | `robo-multipost` |
| Build command | `pnpm run build` |
| Deploy command | `pnpm run deploy` |
| Non-production branch deploy command | `pnpm run deploy:preview` |
| Path | `/` |

## Comandos equivalentes (local)

```bash
pnpm run build
pnpm run deploy
```

ou

```bash
npx wrangler deploy
```

## Variáveis de ambiente (produção)

Obrigatórias:

- `DATABASE_URL`
- `ENCRYPTION_KEY` (64 hex chars)
- `BETTER_AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL` (ou `BETTER_AUTH_URL`)
- `CRON_SECRET`

## Storage default: Cloudflare R2

Quando `STORAGE_PROVIDER` não é preenchido, o app usa:

```env
STORAGE_PROVIDER=CLOUDFLARE_R2
```

Para funcionar com R2, configure:

- `CF_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_URL` (opcional)
- `CF_API_TOKEN` (opcional, para métricas de uso em `/api/media/storage`)

## Cron automático (posts agendados)

Endpoint:

```http
POST /api/cron/process
Authorization: Bearer <CRON_SECRET>
```

Workflow incluso no repo:

- `.github/workflows/cron-process.yml`

Secrets necessários no GitHub:

- `CRON_ENDPOINT_URL` (ex.: `https://robo-multipost.<subdominio>.workers.dev/api/cron/process`)
- `CRON_SECRET`

Observação: GitHub Actions agenda com granularidade mínima de 5 minutos.

## Checklist rápido

- [ ] Projeto no Cloudflare com `Path` = `/`
- [ ] `Build command` = `pnpm run build`
- [ ] `Deploy command` = `pnpm run deploy`
- [ ] Variáveis obrigatórias configuradas
- [ ] Variáveis R2 configuradas (ou outro provider explicitamente definido)
- [ ] `CRON_ENDPOINT_URL` e `CRON_SECRET` configurados no GitHub Actions

## Erros comuns

### `/bin/sh: 1: wrangler.toml: not found`

Você colocou arquivo no campo de comando.
Use comando executável (`pnpm run deploy`), não nome de arquivo.

### `The entry-point file at ".open-next/worker.js" was not found`

Build não rodou antes do deploy.
Confirme `Build command = pnpm run build`.

### Homepage retorna 404

Com essa configuração única, `/` deve responder a landing page.
Se der 404, revise se o deploy está apontando para este repositório/branch e se o build foi concluído com sucesso.
