# Plano: Criar Documentos de Fases 3-7 do Robo MultiPost

## Resumo

Criar 5 documentos markdown detalhados em `.context/docs/` seguindo o formato identico ao `phase-2-auth-workspaces.md`. Cada documento sera autocontido, com estado atual, arquitetura alvo, arquivos a criar/modificar, sub-tarefas, e checklist.

---

## Documento 1: `phase-3-core-scheduler.md`

**Titulo:** Fase 3: Core Scheduler + Hook Migration

**Secoes principais:**

### 1. Estado Atual
- Hooks existem mas usam `useLate()` que retorna null
- Dashboard pages (compose, calendar, queue, accounts) existem com UI completa
- Schema Prisma tem todos os models (Post, PlatformPost, MediaItem, Queue, QueueSlot, CronJob, SocialAccount, Profile)
- Middleware.ts NAO existe (pendente do Phase 2)
- ZERO API routes para posts, accounts, queues, profiles, media, cron

### 2. Arquitetura Alvo
- Middleware.ts protegendo /dashboard/* e API routes
- API routes completas com workspace-scoped queries
- Hooks migrados de Late SDK → fetch('/api/...')
- Cron pipeline: /api/cron/process com locks, retries, logs

### 3. Sub-fases

**3a — Middleware (completar Phase 2)**
- Criar `src/middleware.ts`
- Rotas publicas: /, /login, /signup, /api/auth/*, /invite/*, /api/cron/* (com CRON_SECRET)

**3b — API Routes**
- `src/app/api/posts/route.ts` — GET list, POST create
- `src/app/api/posts/[postId]/route.ts` — GET detail, PUT update, DELETE
- `src/app/api/posts/[postId]/retry/route.ts` — POST retry
- `src/app/api/accounts/route.ts` — GET list
- `src/app/api/accounts/[accountId]/route.ts` — DELETE disconnect
- `src/app/api/accounts/connect/route.ts` — POST initiate OAuth
- `src/app/api/queues/route.ts` — GET list, POST create
- `src/app/api/queues/[queueId]/route.ts` — PUT update, DELETE
- `src/app/api/queues/preview/route.ts` — GET preview slots
- `src/app/api/profiles/route.ts` — GET list, POST create
- `src/app/api/profiles/[profileId]/route.ts` — PUT update
- `src/app/api/media/upload/route.ts` — POST upload

Cada route usa `getWorkspaceUser(headers)` e filtra por workspaceId.

**3c — Hook Migration**
Migrar cada hook de `late.xxx.method()` → `fetch('/api/xxx')`:
- `src/hooks/use-posts.ts` — 7 hooks (usePosts, usePost, useCreatePost, useUpdatePost, useDeletePost, useRetryPost, useCalendarPosts)
- `src/hooks/use-accounts.ts` — 5 hooks (useAccounts, useAccountsHealth, useConnectAccount, useDeleteAccount, useAccountsByPlatform)
- `src/hooks/use-queue.ts` — 8 hooks (useQueues, useQueueSlots, useQueuePreview, useNextQueueSlot, useCreateQueue, useUpdateQueueSlots, useUpdateQueue, useDeleteQueue)
- `src/hooks/use-media.ts` — 3 hooks (useMediaPresign, useUploadMedia, useUploadMultipleMedia)
- `src/hooks/use-profiles.ts` — 4 hooks (useProfiles, useCurrentProfileId, useProfile, useCreateProfile)
- Deletar `src/hooks/use-late.ts` e `src/lib/late-api/` (SDK client-side)

**3d — Cron Publish Pipeline**
- `src/app/api/cron/process/route.ts` — POST endpoint
  - Validar CRON_SECRET header
  - Buscar CronJobs pendentes (status=pending, scheduledAt <= now)
  - Lock (status=locked, lockedAt=now)
  - Chamar provider.publish() (placeholder ate Phase 4)
  - Atualizar status (completed/failed) + logs
  - Retry logic (attempts < maxAttempts)
- `src/lib/queue-scheduler.ts` — Calcular proximo slot da fila

### 4. Arquivos a Criar (~18 novos)
Lista completa de API routes + middleware

### 5. Arquivos a Modificar (~7)
- Todos os hooks em src/hooks/
- src/hooks/index.ts (remover use-late export)
- Possivelmente dashboard pages que importam tipos de @/lib/late-api

### 6. Arquivos a Deletar
- src/hooks/use-late.ts
- src/lib/late-api/ (client-side SDK - se nao for usado server-side pelo LateProvider)

### 7. Ordem de Implementacao
```
3.1 — Middleware.ts
3.2 — API routes: profiles
3.3 — API routes: accounts
3.4 — API routes: queues
3.5 — API routes: posts
3.6 — API routes: media/upload (placeholder)
3.7 — Migrar hooks: use-profiles.ts
3.8 — Migrar hooks: use-accounts.ts
3.9 — Migrar hooks: use-queue.ts
3.10 — Migrar hooks: use-posts.ts
3.11 — Migrar hooks: use-media.ts
3.12 — Cron pipeline: /api/cron/process
3.13 — Queue scheduler: src/lib/queue-scheduler.ts
3.14 — Limpar use-late.ts e late-api client
3.15 — Verificar build, lint, types
```

### 8. Checklist Final
- Build, lint, tsc sem erros
- Middleware bloqueia /dashboard sem session
- Todas API routes retornam dados do DB
- Hooks carregam dados corretamente nas pages
- Cron endpoint processa posts agendados

---

## Documento 2: `phase-4-providers.md`

**Titulo:** Fase 4: Providers (Late + BYO Multi-Platform)

**Secoes principais:**

### 1. Estado Atual
- Schema tem SocialAccount com providerType ("late" | "byo") e campos de token encriptados
- Schema tem Credential para armazenar Late API key
- Nenhum provider implementado
- Callback page existe em src/app/callback/

### 2. Referencia /research
- `research/postiz-app-only-example/libraries/nestjs-libraries/src/integrations/social/`
- Interface ISocialMediaIntegration com post(), authenticate(), refreshToken()
- Providers para todas as 8 redes alvo: instagram.provider.ts, facebook.provider.ts, youtube.provider.ts, linkedin.provider.ts, tiktok.provider.ts, pinterest.provider.ts, x.provider.ts, threads.provider.ts
- **Regra:** Usar como referencia comportamental, NAO copiar codigo

### 3. Arquitetura Alvo

**PostingProvider Interface:**
```
interface PostingProvider {
  publishPost(post, platformPost, account): Promise<PublishResult>
  getAuthUrl(platform, profileId, redirectUrl): Promise<string>
  handleCallback(platform, code, state): Promise<SocialAccount>
  refreshToken(account): Promise<TokenData>
  validateConnection(account): Promise<boolean>
}
```

**Providers:**
- `LateProvider` — Decripta Late API key do Credential, usa Late SDK server-side
- `BYOProvider` — Chama APIs das plataformas diretamente com tokens encriptados

### 4. Arquivos a Criar (~15)
- `src/lib/providers/types.ts` — PostingProvider interface, PublishResult, TokenData
- `src/lib/providers/index.ts` — getProvider(workspaceId) factory
- `src/lib/providers/late-provider.ts` — LateProvider implementation
- `src/lib/providers/byo/base.ts` — Base BYO provider class
- `src/lib/providers/byo/instagram.ts` — Instagram Graph API
- `src/lib/providers/byo/facebook.ts` — Facebook Pages API
- `src/lib/providers/byo/youtube.ts` — YouTube Data API v3
- `src/lib/providers/byo/linkedin.ts` — LinkedIn Marketing API
- `src/lib/providers/byo/tiktok.ts` — TikTok Content Posting API
- `src/lib/providers/byo/pinterest.ts` — Pinterest API v5
- `src/lib/providers/byo/twitter.ts` — X/Twitter API v2
- `src/lib/providers/byo/threads.ts` — Threads API (Meta)
- `src/app/api/accounts/connect/[platform]/route.ts` — Platform-specific OAuth initiation
- `src/app/api/accounts/callback/route.ts` — OAuth callback handler (server-side)
- Documentacao: `.context/docs/providers.md`

### 5. Arquivos a Modificar
- `src/app/api/cron/process/route.ts` — Substituir placeholder por provider.publishPost()
- `src/app/api/accounts/connect/route.ts` — Usar provider.getAuthUrl()
- `src/app/callback/_components/callback-client.tsx` — Adaptar para novo flow

### 6. Plataformas BYO (8 no MVP)

| Plataforma | API | OAuth | Tipo de Post MVP |
|------------|-----|-------|------------------|
| Instagram | Graph API | OAuth 2.0 (Facebook Login) | Imagem + legenda |
| Facebook Page | Graph API | OAuth 2.0 | Texto + imagem |
| YouTube | Data API v3 | OAuth 2.0 | Video upload |
| LinkedIn | Marketing API | OAuth 2.0 | Texto + imagem |
| TikTok | Content Posting API | OAuth 2.0 | Video upload |
| Pinterest | API v5 | OAuth 2.0 | Pin (imagem + link) |
| X/Twitter | API v2 | OAuth 2.0 PKCE | Texto + imagem |
| Threads | Threads API | OAuth 2.0 (Meta) | Texto + imagem |

### 7. Ordem de Implementacao
```
4.1 — PostingProvider interface + types
4.2 — Provider factory (getProvider)
4.3 — LateProvider (Late SDK server-side)
4.4 — BYO base class
4.5 — Instagram BYO (mais simples, proof-of-concept)
4.6 — Facebook Page BYO
4.7 — X/Twitter BYO
4.8 — Threads BYO
4.9 — LinkedIn BYO
4.10 — Pinterest BYO
4.11 — YouTube BYO (video - mais complexo)
4.12 — TikTok BYO (video - mais complexo)
4.13 — OAuth flow completo (connect + callback)
4.14 — Integrar com cron pipeline
4.15 — Documentacao
```

---

## Documento 3: `phase-5-storage.md`

**Titulo:** Fase 5: Media Storage

### 1. Estado Atual
- Schema MediaItem tem campos: url, key, provider, filename, contentType, size
- Hook use-media.ts existe (usa Late presign URL)
- Nenhuma implementacao de storage
- Compose page tem media-uploader.tsx component

### 2. Arquitetura Alvo

**MediaStorage Interface:**
```
interface MediaStorage {
  upload(file: Buffer, options: UploadOptions): Promise<StoredMedia>
  delete(key: string): Promise<void>
  getUrl(key: string): Promise<string>
}
```

### 3. Arquivos a Criar (~6)
- `src/lib/storage/types.ts` — Interface + tipos
- `src/lib/storage/index.ts` — getStorage() factory (le STORAGE_PROVIDER env)
- `src/lib/storage/vercel-blob.ts` — Vercel Blob implementation
- `src/lib/storage/s3-storage.ts` — S3-compatible implementation
- `src/lib/storage/url-only.ts` — URL-only (sem upload, so referencia)
- Documentacao: `.context/docs/storage.md` (ja pode existir)

### 4. Arquivos a Modificar
- `src/app/api/media/upload/route.ts` — Implementar upload real
- `src/hooks/use-media.ts` — Adaptar para novo endpoint
- `src/app/dashboard/compose/_components/media-uploader.tsx` — Ajustar se necessario

### 5. Env Vars
- STORAGE_PROVIDER=VERCEL_BLOB | S3_COMPAT | URL_ONLY
- BLOB_READ_WRITE_TOKEN (Vercel Blob)
- S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET

---

## Documento 4: `phase-6-ai.md`

**Titulo:** Fase 6: AI Integration (Texto + Imagem)

### 1. Arquitetura Alvo
- /api/ai/generate-text — Gerar legendas, variacoes de texto
- /api/ai/generate-image — Gerar imagens
- OpenRouter como provider principal (texto + imagem)
- KIE Nano Banana como alternativa futura para imagem
- Chaves de IA armazenadas em Credential (encriptadas)

### 2. Arquivos a Criar (~8)
- `src/lib/ai/types.ts` — AIProvider interface
- `src/lib/ai/index.ts` — getAIProvider() factory
- `src/lib/ai/openrouter.ts` — OpenRouter implementation
- `src/app/api/ai/generate-text/route.ts` — POST endpoint
- `src/app/api/ai/generate-image/route.ts` — POST endpoint
- `src/hooks/use-ai.ts` — React Query hooks para AI
- `src/app/dashboard/compose/_components/ai-assistant.tsx` — UI no composer
- Documentacao: `.context/docs/ai.md`

### 3. Arquivos a Modificar
- `src/app/dashboard/compose/page.tsx` — Adicionar AI assistant panel
- `src/app/dashboard/settings/page.tsx` — Card para configurar AI API key

### 4. Env Vars
- AI_PROVIDER=OPENROUTER | NONE
- (AI keys ficam no DB via Credential, nao em env)

---

## Documento 5: `phase-7-public-api.md`

**Titulo:** Fase 7: Public API v1

### 1. Arquitetura Alvo
- Namespace separado: /api/public/v1/*
- Auth via API key (header X-API-Key)
- API keys por workspace, armazenadas encriptadas
- Rate limiting basico

### 2. Arquivos a Criar (~8)
- `src/app/api/public/v1/posts/route.ts` — GET list, POST create/schedule
- `src/app/api/public/v1/posts/[postId]/route.ts` — GET detail
- `src/app/api/public/v1/media/route.ts` — POST upload
- `src/lib/api-keys/index.ts` — Gerar, validar, revogar API keys
- `src/lib/api-keys/rate-limit.ts` — Rate limiting (in-memory ou Redis)
- `src/app/api/public/v1/middleware.ts` — API key validation middleware
- `src/app/dashboard/settings/_components/api-keys.tsx` — UI para gerenciar API keys
- Documentacao: `.context/docs/public-api.md`

### 3. Schema Changes
- Adicionar model `ApiKey` ao schema.prisma:
  - id, workspaceId, name, keyHash, prefix, lastUsedAt, expiresAt, createdAt

### 4. Env Vars
- RATE_LIMIT_WINDOW_MS=60000
- RATE_LIMIT_MAX_REQUESTS=60

---

## Verificacao Geral

Para cada documento criado:
1. Formato identico ao phase-2-auth-workspaces.md
2. Secoes numeradas (1-13+)
3. Tabelas de arquivos com proposito e detalhes
4. Sub-tarefas com comandos de verificacao
5. Checklist final com build/lint/tsc
6. Referencia ao /research quando aplicavel
7. Riscos e mitigacoes
8. Decisoes de design documentadas
