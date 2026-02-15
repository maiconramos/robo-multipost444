# Fase 3: Core Scheduler + Hook Migration

> **Status:** Plano detalhado. SEM implementação.
> **Pré-requisito:** Fase 2 (Auth + Workspaces) concluída (exceto middleware.ts).
> **Objetivo:** Criar todas as API routes, migrar hooks de Late SDK para `/api/*`, implementar cron publish pipeline, e finalizar middleware de proteção de rotas.

---

## 1. Estado Atual (o que existe hoje)

### 1.1. Hooks (UI ↔ Dados)

Todos os hooks existem em `src/hooks/` e usam React Query, mas dependem de `useLate()` que retorna `null`:

| Arquivo | Hooks | Chamadas Late SDK |
|---------|-------|-------------------|
| `src/hooks/use-posts.ts` (230 linhas) | usePosts, usePost, useCreatePost, useUpdatePost, useDeletePost, useRetryPost, useCalendarPosts, useScheduledPosts, useRecentPosts | `late.posts.listPosts()`, `late.posts.getPost()`, `late.posts.createPost()`, `late.posts.updatePost()`, `late.posts.deletePost()`, `late.posts.retryPost()` |
| `src/hooks/use-accounts.ts` (148 linhas) | useAccounts, useAccountsHealth, useConnectAccount, useDeleteAccount, useAccountsByPlatform | `late.accounts.listAccounts()`, `late.accounts.getAllAccountsHealth()`, `late.connect.getConnectUrl()`, `late.accounts.deleteAccount()` |
| `src/hooks/use-queue.ts` (427 linhas) | useQueues, useQueueSlots, useQueuePreview, useNextQueueSlot, useCreateQueue, useUpdateQueueSlots, useUpdateQueue, useDeleteQueue, useToggleQueueActive, useSetDefaultQueue | `late.queue.listQueueSlots()`, `late.queue.previewQueue()`, `late.queue.getNextQueueSlot()`, `late.queue.createQueueSlot()`, `late.queue.updateQueueSlot()`, `late.queue.deleteQueueSlot()` |
| `src/hooks/use-media.ts` (128 linhas) | useMediaPresign, useUploadMedia, useUploadMultipleMedia | `late.media.getMediaPresignedUrl()` |
| `src/hooks/use-profiles.ts` (121 linhas) | useProfiles, useCurrentProfileId, useProfile, useCreateProfile, useUpdateProfile | `late.profiles.listProfiles()`, `late.profiles.getProfile()`, `late.profiles.createProfile()`, `late.profiles.updateProfile()` |
| `src/hooks/use-late.ts` (26 linhas) | useLate, useLateClient | **DEPRECATED** — retorna `null` |

**Problema central:** Todos os hooks têm `enabled: !!late && ...` mas `late` é sempre `null`, então nenhum hook funciona.

### 1.2. API Routes (quase nenhuma)

Existem apenas 4 API routes:

| Route | Status | Propósito |
|-------|--------|-----------|
| `src/app/api/auth/[...all]/route.ts` | ✅ Funcional | Better Auth handler |
| `src/app/api/validate-key/route.ts` | ⚠️ Legacy | Valida Late API key (pode ser mantido para setup do provider) |
| `src/app/api/workspaces/route.ts` | ✅ Funcional | GET list, POST create workspace |
| `src/app/api/workspaces/invite/route.ts` | ✅ Funcional | POST create, PUT accept invite |

**Faltam:** `/api/posts/*`, `/api/accounts/*`, `/api/queues/*`, `/api/profiles/*`, `/api/media/*`, `/api/cron/*`

### 1.3. Middleware (NÃO EXISTE)

O `src/middleware.ts` ainda não foi criado. Rotas do dashboard e APIs internas não estão protegidas server-side.

### 1.4. Schema Prisma (COMPLETO)

Todos os models necessários já existem em `prisma/schema.prisma`:
- `Post`, `PlatformPost`, `MediaItem` — hierarquia de posts
- `SocialAccount`, `Profile` — contas e perfis
- `Queue`, `QueueSlot` — filas de agendamento
- `CronJob` — jobs de publicação
- `Credential` — credenciais encriptadas

### 1.5. Dashboard Pages (UI COMPLETA)

| Page | Arquivo | Componentes |
|------|---------|-------------|
| Compose | `src/app/dashboard/compose/page.tsx` | media-uploader.tsx, platform-selector.tsx, schedule-picker.tsx |
| Calendar | `src/app/dashboard/calendar/page.tsx` | calendar-grid.tsx, calendar-list.tsx |
| Queue | `src/app/dashboard/queue/page.tsx` (948 linhas) | UI completa de gerenciamento |
| Accounts | `src/app/dashboard/accounts/page.tsx` | connect-platform-grid.tsx |
| Settings | `src/app/dashboard/settings/page.tsx` | Theme, timezone, logout |
| Home | `src/app/dashboard/page.tsx` | Overview stats, recent posts, upcoming queue |

### 1.6. Late API Client (server-side)

```typescript
// src/lib/late-api/client.ts — Será usado pelo LateProvider na Fase 4
export function createLateClient(apiKey?: string): Late {
  const key = apiKey || process.env.LATE_API_KEY;
  return new Late({ apiKey: key });
}
```

**Nota:** Este client NÃO será deletado — o `LateProvider` (Fase 4) o usará server-side. Apenas o `use-late.ts` (hook client-side) será deletado.

### 1.7. Tipos de Plataforma

```typescript
// src/lib/late-api/types.ts — Tipos que hooks importam
export type Platform = "instagram" | "tiktok" | "youtube" | "linkedin" | ...
export interface TikTokPlatformData { ... }
export interface YouTubePlatformData { ... }
// ... etc para cada plataforma
```

**Decisão:** Mover `types.ts` para `src/lib/platforms/types.ts` (sem dependência do Late SDK) e manter `client.ts` em `src/lib/late-api/` para uso server-side.

---

## 2. Arquitetura Alvo (como ficará após Fase 3)

### 2.1. Novo Fluxo de Dados

```
Dashboard Page (React Component)
  → React Query Hook (e.g., usePosts)
  → fetch('/api/posts', { credentials: 'include' })
  → API Route (src/app/api/posts/route.ts)
    → getWorkspaceUser(headers) — valida session, retorna workspace
    → Prisma query (filtrado por workspaceId)
  → Response JSON
  → React Query cache
  → UI atualizada
```

### 2.2. Padrão de API Route

Todas as API routes seguem este padrão (baseado no existente `src/app/api/workspaces/route.ts`):

```typescript
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWorkspaceUser } from "@/lib/auth/get-current-user";

export async function GET(request: NextRequest) {
  try {
    const { user, workspace } = await getWorkspaceUser(request.headers);

    const items = await prisma.model.findMany({
      where: { workspaceId: workspace.id }, // SEMPRE filtrar por workspace
      // ...
    });

    return NextResponse.json({ items });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "NO_WORKSPACE") {
      return NextResponse.json({ error: "No workspace" }, { status: 403 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### 2.3. Padrão de Hook Migrado

```typescript
// ANTES (Late SDK):
export function usePosts(filters) {
  const late = useLate();
  return useQuery({
    queryFn: async () => {
      if (!late) throw new Error("Not authenticated");
      const { data, error } = await late.posts.listPosts({ query: filters });
      if (error) throw error;
      return data;
    },
    enabled: !!late && !!profileId,
  });
}

// DEPOIS (API route):
export function usePosts(filters) {
  const currentProfileId = useCurrentProfileId();
  const profileId = filters.profileId || currentProfileId;

  return useQuery({
    queryFn: async () => {
      const params = new URLSearchParams();
      if (profileId) params.set("profileId", profileId);
      if (filters.status) params.set("status", filters.status);
      // ...
      const res = await fetch(`/api/posts?${params}`);
      if (!res.ok) throw new Error("Failed to fetch posts");
      return res.json();
    },
    enabled: !!profileId,
  });
}
```

### 2.4. Middleware

```
Request → middleware.ts
  → Rota pública? (/, /login, /signup, /api/auth/*, /invite/*) → Permite
  → Rota de cron? (/api/cron/*) → Valida CRON_SECRET header → Permite/Rejeita
  → Rota protegida? (/dashboard/*, /api/posts/*, etc.)
    → Session cookie válida? → Permite
    → Sem session? → Redirect /login (pages) ou 401 (API routes)
```

---

## 3. Arquivos a Criar (20 novos)

### 3.1. Middleware

| Arquivo | Propósito | Detalhes |
|---------|-----------|----------|
| `src/middleware.ts` | Proteção de rotas no edge | Intercepta `/dashboard/*` e API routes protegidas. Valida session cookie. Redirect/401 se inválido. Bypass para rotas públicas |

### 3.2. API Routes — Profiles

| Arquivo | Propósito | Detalhes |
|---------|-----------|----------|
| `src/app/api/profiles/route.ts` | CRUD de profiles | `GET` — lista profiles do workspace. `POST` — cria profile (name) |
| `src/app/api/profiles/[profileId]/route.ts` | Profile individual | `GET` — detalhes. `PUT` — atualiza (name, timezone) |

### 3.3. API Routes — Accounts

| Arquivo | Propósito | Detalhes |
|---------|-----------|----------|
| `src/app/api/accounts/route.ts` | Listar contas | `GET` — lista SocialAccounts do workspace, filtro por profileId |
| `src/app/api/accounts/[accountId]/route.ts` | Conta individual | `GET` — detalhes. `DELETE` — desconectar conta |
| `src/app/api/accounts/connect/route.ts` | Iniciar conexão | `POST { platform, profileId }` — retorna URL de OAuth (placeholder até Fase 4) |
| `src/app/api/accounts/health/route.ts` | Health check | `GET` — status de saúde das contas do workspace |

### 3.4. API Routes — Queues

| Arquivo | Propósito | Detalhes |
|---------|-----------|----------|
| `src/app/api/queues/route.ts` | CRUD de filas | `GET` — lista queues do workspace (filtro por profileId). `POST` — cria queue (name, timezone, slots) |
| `src/app/api/queues/[queueId]/route.ts` | Fila individual | `GET` — detalhes com slots. `PUT` — atualiza (name, timezone, slots, active, setAsDefault). `DELETE` — remove fila |
| `src/app/api/queues/preview/route.ts` | Preview de slots | `GET ?profileId=X&count=10` — retorna próximos N horários computados |
| `src/app/api/queues/next-slot/route.ts` | Próximo slot | `GET ?profileId=X` — retorna próximo slot disponível |

### 3.5. API Routes — Posts

| Arquivo | Propósito | Detalhes |
|---------|-----------|----------|
| `src/app/api/posts/route.ts` | CRUD de posts | `GET` — lista posts (filtros: profileId, status, dateFrom, dateTo, page, limit). `POST` — cria post (content, mediaItems, platforms, scheduledFor) |
| `src/app/api/posts/[postId]/route.ts` | Post individual | `GET` — detalhes com platformPosts e media. `PUT` — atualiza (content, mediaItems, platforms, scheduledFor). `DELETE` — remove post |
| `src/app/api/posts/[postId]/retry/route.ts` | Retry de post | `POST` — reseta status para scheduled, incrementa attempts |

### 3.6. API Routes — Media

| Arquivo | Propósito | Detalhes |
|---------|-----------|----------|
| `src/app/api/media/upload/route.ts` | Upload de mídia | `POST` (multipart/form-data) — recebe arquivo, salva (placeholder até Fase 5), retorna URL. Registra MediaItem no DB |

### 3.7. API Routes — Cron

| Arquivo | Propósito | Detalhes |
|---------|-----------|----------|
| `src/app/api/cron/process/route.ts` | Worker de publicação | `POST` — validar CRON_SECRET. Buscar CronJobs pendentes. Lock → Publish (placeholder) → Update status. Retry logic |

### 3.8. Lib

| Arquivo | Propósito | Detalhes |
|---------|-----------|----------|
| `src/lib/queue-scheduler.ts` | Cálculo de slots | `getNextSlots(queue, count)` — computa próximos N horários baseado nos QueueSlots e timezone. `getNextAvailableSlot(queue)` — próximo horário livre |
| `src/lib/platforms/types.ts` | Tipos de plataforma (movido) | Mover de `src/lib/late-api/types.ts`. Platform, PLATFORMS, PLATFORM_NAMES, PLATFORM_COLORS, constraints, PlatformSpecificData |

---

## 4. Arquivos a Modificar (8 existentes)

### 4.1. `src/hooks/use-posts.ts`

**Antes:** Todos os hooks chamam `late.posts.*()`.
**Depois:** Todos os hooks chamam `fetch('/api/posts/...')`.

**Mudanças concretas:**
- Remover: `import { useLate } from "./use-late"`
- Remover: `const late = useLate()` de todos os hooks
- Remover: `enabled: !!late && ...` → `enabled: !!profileId`
- Substituir: `late.posts.listPosts({ query })` → `fetch('/api/posts?' + params)`
- Substituir: `late.posts.createPost({ body })` → `fetch('/api/posts', { method: 'POST', body: JSON.stringify(input) })`
- Substituir: `late.posts.updatePost({ path, body })` → `fetch('/api/posts/${postId}', { method: 'PUT', body })`
- Substituir: `late.posts.deletePost({ path })` → `fetch('/api/posts/${postId}', { method: 'DELETE' })`
- Substituir: `late.posts.retryPost({ path })` → `fetch('/api/posts/${postId}/retry', { method: 'POST' })`
- Atualizar: imports de tipos (`Platform`, `PlatformSpecificData`) para `@/lib/platforms/types`

### 4.2. `src/hooks/use-accounts.ts`

**Antes:** Chama `late.accounts.*()` e `late.connect.*()`.
**Depois:** Chama `fetch('/api/accounts/...')`.

**Mudanças concretas:**
- Remover: `useLate()` e `enabled: !!late`
- `useAccounts` → `fetch('/api/accounts?profileId=X')`
- `useAccountsHealth` → `fetch('/api/accounts/health?profileId=X')`
- `useConnectAccount` → `fetch('/api/accounts/connect', { method: 'POST', body: { platform, profileId } })`
- `useDeleteAccount` → `fetch('/api/accounts/${accountId}', { method: 'DELETE' })`
- Atualizar tipos: `Account` interface para alinhar com schema Prisma (`SocialAccount`)

### 4.3. `src/hooks/use-queue.ts`

**Antes:** Chama `late.queue.*()`.
**Depois:** Chama `fetch('/api/queues/...')`.

**Mudanças concretas:**
- `useQueues` → `fetch('/api/queues?profileId=X')`
- `useQueueSlots` → `fetch('/api/queues/${queueId}')`
- `useQueuePreview` → `fetch('/api/queues/preview?profileId=X&count=N')`
- `useNextQueueSlot` → `fetch('/api/queues/next-slot?profileId=X')`
- `useCreateQueue` → `fetch('/api/queues', { method: 'POST', body })`
- `useUpdateQueueSlots` / `useUpdateQueue` → `fetch('/api/queues/${queueId}', { method: 'PUT', body })`
- `useDeleteQueue` → `fetch('/api/queues/${queueId}', { method: 'DELETE' })`
- Manter: helpers utilitários (`formatTime`, `parseTime`, `getSlotTime`, `normalizeSlot`, `DAYS_OF_WEEK`, etc.)

### 4.4. `src/hooks/use-media.ts`

**Antes:** Chama `late.media.getMediaPresignedUrl()`.
**Depois:** Chama `fetch('/api/media/upload')` com FormData.

**Mudanças concretas:**
- `useMediaPresign` → remover (presign não é mais necessário, upload direto)
- `useUploadMedia` → `fetch('/api/media/upload', { method: 'POST', body: formData })`
- `useUploadMultipleMedia` → idem, em paralelo
- Manter: helpers utilitários (`getMediaType`, `isValidMediaType`, `getMaxFileSize`)

### 4.5. `src/hooks/use-profiles.ts`

**Antes:** Chama `late.profiles.*()`.
**Depois:** Chama `fetch('/api/profiles/...')`.

**Mudanças concretas:**
- `useProfiles` → `fetch('/api/profiles')`
- `useProfile` → `fetch('/api/profiles/${profileId}')`
- `useCreateProfile` → `fetch('/api/profiles', { method: 'POST', body: { name } })`
- `useUpdateProfile` → `fetch('/api/profiles/${profileId}', { method: 'PUT', body })`
- Manter: `useCurrentProfileId` (lê de `useAppStore`)

### 4.6. `src/hooks/index.ts`

**Mudanças:**
- Remover: `export { useLate, useLateClient } from "./use-late"`
- Atualizar: tipo `Account` (alinhado com Prisma `SocialAccount`)
- Re-exportar tipos de `@/lib/platforms/types` se necessário

### 4.7. `src/lib/late-api/types.ts` → `src/lib/platforms/types.ts`

**Mudança:** Mover arquivo de `src/lib/late-api/types.ts` para `src/lib/platforms/types.ts`.
- O arquivo `types.ts` não depende do Late SDK — é independente
- Atualizar todos os imports em hooks e components de `@/lib/late-api` para `@/lib/platforms/types`

### 4.8. Componentes que importam de `@/lib/late-api`

Verificar e atualizar imports em:
- `src/components/shared/platform-icon.tsx`
- `src/app/dashboard/compose/_components/platform-selector.tsx`
- `src/app/dashboard/accounts/_components/connect-platform-grid.tsx`
- Qualquer outro que importe `Platform` ou `PlatformSpecificData` de `@/lib/late-api`

---

## 5. Arquivos a Deletar (1-2)

| Arquivo | Motivo |
|---------|--------|
| `src/hooks/use-late.ts` | Hook deprecated — retorna null. Todos os hooks migrados para fetch |
| `src/lib/late-api/index.ts` | Re-export file — tipos movidos para `@/lib/platforms/types`, client fica em `@/lib/late-api/client` |

**Nota:** Manter `src/lib/late-api/client.ts` — o `LateProvider` (Fase 4) o usará server-side para chamar Late API.

---

## 6. Sub-tarefas Detalhadas

### 6a. Middleware de Proteção de Rotas

1. Criar `src/middleware.ts`:

```
Rotas públicas (bypass):
  - /
  - /login
  - /signup
  - /api/auth/*
  - /invite/*
  - /_next/*
  - /favicon.ico
  - /robots.txt

Rota de cron (auth via header):
  - /api/cron/* → validar header Authorization: Bearer ${CRON_SECRET}

Rotas protegidas (requer session):
  - /dashboard/*
  - /api/posts/*
  - /api/accounts/*
  - /api/queues/*
  - /api/profiles/*
  - /api/media/*
  - /api/workspaces/*
```

2. Lógica:
   - Ler session cookie via Better Auth
   - Session válida → `NextResponse.next()`
   - Session inválida + page request → `NextResponse.redirect('/login')`
   - Session inválida + API request → `NextResponse.json({ error: 'Unauthorized' }, { status: 401 })`

**Verificação:**
```bash
# Sem login: /dashboard → redirect /login
# Sem login: GET /api/posts → 401
# Com login: /dashboard → permite
# Rotas públicas: / → permite sem session
# Cron: POST /api/cron/process sem CRON_SECRET → 401
# Cron: POST /api/cron/process com CRON_SECRET → permite
```

### 6b. API Routes — Profiles

1. `src/app/api/profiles/route.ts`:
   - `GET`: `getWorkspaceUser(headers)` → `prisma.profile.findMany({ where: { workspaceId } })`
   - `POST`: validar `{ name }` → `prisma.profile.create({ data: { name, workspaceId } })`

2. `src/app/api/profiles/[profileId]/route.ts`:
   - `GET`: buscar profile por id + workspaceId
   - `PUT`: validar body → atualizar profile (verificar que pertence ao workspace)

**Verificação:**
```bash
curl -b cookie.txt http://localhost:3000/api/profiles          # Lista profiles
curl -b cookie.txt -X POST -d '{"name":"Meu Perfil"}' .../api/profiles  # Cria
```

### 6c. API Routes — Accounts

1. `src/app/api/accounts/route.ts`:
   - `GET ?profileId=X`: `prisma.socialAccount.findMany({ where: { workspaceId, profileId } })`
   - Retornar: `{ accounts: [...] }` (excluir campos encriptados: accessTokenEnc, refreshTokenEnc)

2. `src/app/api/accounts/[accountId]/route.ts`:
   - `GET`: detalhes da conta (sem tokens)
   - `DELETE`: `prisma.socialAccount.delete({ where: { id, workspaceId } })`

3. `src/app/api/accounts/connect/route.ts`:
   - `POST { platform, profileId }`: Placeholder que retorna `{ error: "Providers not yet implemented" }` com status 501
   - Será implementado na Fase 4 com provider.getAuthUrl()

4. `src/app/api/accounts/health/route.ts`:
   - `GET ?profileId=X`: verificar status de cada conta (token não expirado, etc.)

### 6d. API Routes — Queues

1. `src/app/api/queues/route.ts`:
   - `GET ?profileId=X`: listar queues do workspace (com slots, filtro por profileId)
   - `POST { profileId, name, timezone, slots, active }`: criar queue + QueueSlots

2. `src/app/api/queues/[queueId]/route.ts`:
   - `GET`: queue com slots
   - `PUT { name?, timezone?, slots?, active?, setAsDefault? }`: atualizar queue
     - Se `setAsDefault=true`: setar `isDefault=false` em todas as outras queues do profile, setar esta como `true`
     - Se `slots` fornecido: deletar slots existentes e recriar (replace strategy)
   - `DELETE`: deletar queue e slots (cascade)

3. `src/app/api/queues/preview/route.ts`:
   - `GET ?profileId=X&count=10`: usar `queue-scheduler.ts` para computar próximos N horários

4. `src/app/api/queues/next-slot/route.ts`:
   - `GET ?profileId=X&queueId=Y`: próximo slot disponível

### 6e. API Routes — Posts

1. `src/app/api/posts/route.ts`:
   - `GET`: query params → `prisma.post.findMany({ where: { workspaceId, profileId?, status? }, include: { platformPosts: true, mediaItems: true }, orderBy: { scheduledFor: 'asc' }, skip, take })`
   - `POST`: Lógica de criação:
     1. Validar body com Zod: `{ content, mediaItems?, platforms, scheduledFor?, publishNow?, timezone?, queuedFromProfile? }`
     2. Criar `Post` com status 'draft' ou 'scheduled'
     3. Criar `PlatformPost` para cada plataforma/conta selecionada
     4. Criar `MediaItem` para cada mídia
     5. Se `scheduledFor` → criar `CronJob` (status: pending, scheduledAt)
     6. Se `publishNow` → criar CronJob com scheduledAt = now
     7. Retornar post criado com includes

2. `src/app/api/posts/[postId]/route.ts`:
   - `GET`: buscar com includes (platformPosts, mediaItems, cronJob)
   - `PUT`: atualizar content, scheduledFor, media, platforms. Se mudou scheduledFor → atualizar CronJob
   - `DELETE`: deletar post (cascade deleta platformPosts, mediaItems, cronJob)

3. `src/app/api/posts/[postId]/retry/route.ts`:
   - `POST`: Verificar que post está FAILED. Resetar status para 'scheduled'. Atualizar CronJob: status='pending', attempts++, lastError=null, lockedAt=null

### 6f. API Routes — Media Upload

1. `src/app/api/media/upload/route.ts`:
   - `POST` (multipart/form-data):
     1. `getWorkspaceUser(headers)` — validar auth
     2. Extrair arquivo do FormData
     3. Validar tipo (imagem ou vídeo) e tamanho
     4. **Placeholder de storage:** Salvar como base64 em memória ou retornar URL fake (será implementado na Fase 5)
     5. Retornar `{ url, type, filename, contentType, size }`

### 6g. Cron Publish Pipeline

1. `src/app/api/cron/process/route.ts`:

```
POST /api/cron/process
  Headers: Authorization: Bearer ${CRON_SECRET}

  1. Validar CRON_SECRET
  2. Buscar CronJobs:
     WHERE status = 'pending'
     AND scheduledAt <= NOW()
     AND attempts < maxAttempts
     ORDER BY scheduledAt ASC
     LIMIT 10  // processar em batch
  3. Para cada job:
     a. Lock: UPDATE status = 'locked', lockedAt = NOW(), lockedBy = instanceId
     b. Buscar Post com includes (platformPosts → accounts, mediaItems)
     c. Para cada PlatformPost:
        - Chamar provider.publishPost() — PLACEHOLDER retornando sucesso fake
        - Atualizar PlatformPost: status, platformPostId, platformPostUrl, publishedAt
     d. Se TODOS os PlatformPosts publicados:
        - Post.status = 'published', Post.publishedAt = NOW()
        - CronJob.status = 'completed', CronJob.completedAt = NOW()
     e. Se algum falhou:
        - Post.status = 'failed'
        - CronJob.status = 'failed', CronJob.lastError = errorMessage
        - CronJob.attempts += 1
  4. Retornar { processed: N, succeeded: N, failed: N }
```

2. `src/lib/queue-scheduler.ts`:

```typescript
/**
 * Compute next N queue slots from now.
 * Considers queue timezone, day-of-week, and time slots.
 */
export function getNextSlots(
  slots: QueueSlot[],
  timezone: string,
  count: number,
  after?: Date
): Date[] { ... }

/**
 * Get the next available slot (first slot in the future).
 */
export function getNextAvailableSlot(
  slots: QueueSlot[],
  timezone: string
): Date | null { ... }
```

### 6h. Migrar Hooks

Para cada hook, o padrão de migração é:

1. Remover `import { useLate } from "./use-late"`
2. Remover `const late = useLate()`
3. Substituir `queryFn` de `late.xxx.method()` para `fetch('/api/xxx')`
4. Substituir `enabled: !!late && ...` para `enabled: !!dependência`
5. Adaptar tipos de retorno para alinhar com response do API route (Prisma models)

**Atenção:** Os hooks atuais usam tipos da Late SDK (ex: `late.posts.listPosts()` retorna formato Late). Os API routes retornarão formato Prisma. É preciso alinhar os tipos ou criar uma camada de adaptação.

### 6i. Mover Tipos de Plataforma

1. Copiar `src/lib/late-api/types.ts` para `src/lib/platforms/types.ts`
2. Atualizar TODOS os imports:
   - `@/lib/late-api` → `@/lib/platforms/types` (ou `@/lib/platforms`)
3. Buscar com grep: `from "@/lib/late-api"` ou `from '@/lib/late-api'`
4. Manter `src/lib/late-api/client.ts` para uso server-side (LateProvider)
5. Atualizar `src/lib/late-api/index.ts` para exportar apenas `client`

### 6j. Limpeza Final

1. Deletar `src/hooks/use-late.ts`
2. Remover exports de `use-late` do `src/hooks/index.ts`
3. Verificar que nenhum arquivo importa de `use-late`

---

## 7. Ordem de Implementação

```
Etapa 1 — Infraestrutura (pode ser feita sem quebrar nada):
  3.1 — Mover tipos: src/lib/late-api/types.ts → src/lib/platforms/types.ts
  3.2 — Atualizar imports de tipos em hooks e components
  3.3 — Criar middleware.ts
  3.4 — Criar src/lib/queue-scheduler.ts

Etapa 2 — API Routes (adicionam endpoints sem afetar UI):
  3.5 — API routes: profiles (/api/profiles, /api/profiles/[profileId])
  3.6 — API routes: accounts (/api/accounts, /api/accounts/[accountId], connect, health)
  3.7 — API routes: queues (/api/queues, /api/queues/[queueId], preview, next-slot)
  3.8 — API routes: posts (/api/posts, /api/posts/[postId], retry)
  3.9 — API routes: media (/api/media/upload — placeholder)
  3.10 — API routes: cron (/api/cron/process)

Etapa 3 — Migrar Hooks (troca a fonte de dados):
  3.11 — Migrar use-profiles.ts (mais simples, menos dependências)
  3.12 — Migrar use-accounts.ts
  3.13 — Migrar use-queue.ts
  3.14 — Migrar use-posts.ts
  3.15 — Migrar use-media.ts

Etapa 4 — Limpeza:
  3.16 — Deletar use-late.ts
  3.17 — Limpar late-api/index.ts
  3.18 — Verificar build, lint, types
```

**Ponto de atenção:** As Etapas 1 e 2 podem ser feitas em paralelo. A Etapa 3 depende da Etapa 2 (API routes devem existir antes da migração dos hooks). A Etapa 4 depende da Etapa 3.

---

## 8. Variáveis de Ambiente

### Novas (obrigatórias para Fase 3)

```env
# Cron
CRON_SECRET=<random-string>    # Gerar: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Já existentes (manter)

```env
DATABASE_URL=postgresql://...
BETTER_AUTH_SECRET=...
BETTER_AUTH_URL=http://localhost:3000
ENCRYPTION_KEY=<64-char-hex>
```

---

## 9. Decisões de Design

### D1: Formato de resposta dos API routes

**Recomendação:** Retornar formato Prisma diretamente (ex: `{ posts: Post[] }`), sem transformar para formato Late SDK.
**Motivo:** Evita camada de adaptação desnecessária. Hooks devem adaptar os tipos localmente.

### D2: Onde validar inputs dos API routes?

**Recomendação:** Usar Zod para validação no server. Definir schemas Zod por route.
**Motivo:** Consistência com padrões do ecossistema Next.js. Type-safe. Mensagens de erro claras.

### D3: Paginação nas list routes

**Recomendação:** Offset-based (`page` + `limit`), com default `limit=50`.
**Motivo:** Simples de implementar. Alinhado com interface existente dos hooks.

### D4: Mover tipos de plataforma ou manter em late-api?

**Recomendação:** Mover para `src/lib/platforms/types.ts`.
**Motivo:** Os tipos (Platform, constraints, etc.) são independentes do Late SDK. Ficar em `late-api/` implica dependência que não existe.

### D5: Placeholder vs implementação real do storage?

**Recomendação:** Placeholder no upload — aceitar arquivo mas retornar URL temporária/fake.
**Motivo:** Storage completo é Fase 5. O upload route precisa existir para que o hook funcione, mas a implementação real vem depois.

### D6: Placeholder vs implementação real do publish?

**Recomendação:** Cron pipeline completo com placeholder no publish — marcar como published com dados fake.
**Motivo:** Provider é Fase 4. A pipeline de cron (locks, retries, status updates) pode ser testada sem provider real.

---

## 10. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Tipos de retorno dos API routes diferem do que UI espera | ALTO | Mapear tipos antes de migrar hooks. Criar interfaces alinhadas com Prisma models |
| Middleware bloqueia rotas que deveria permitir | ALTO | Manter lista explícita de rotas públicas. Testar CADA rota |
| Race condition no lock do CronJob | MÉDIO | Usar `UPDATE ... WHERE status = 'pending'` atômico no Prisma. Unique constraint |
| Performance das queries sem índices | MÉDIO | Adicionar índices no schema se necessário (status + scheduledAt já existe no CronJob) |
| Hooks migrados quebram UI por formato de dados diferente | ALTO | Testar cada page manualmente após migrar seu hook correspondente |
| Media upload placeholder insuficiente para teste | BAIXO | Permitir URL-only no placeholder (usuário cola URL em vez de upload) |

---

## 11. Referência ao /research

Para implementação dos API routes, consultar a estrutura do Postiz como referência:
- `research/postiz-app-only-example/` — Arquitetura geral
- **Não copiar código** — apenas referência comportamental

---

## 12. Checklist Final — Fase 3

### Infraestrutura
- [ ] `src/middleware.ts` — Criado e funcional
- [ ] `src/lib/platforms/types.ts` — Tipos movidos de late-api
- [ ] `src/lib/queue-scheduler.ts` — Cálculo de slots funcional
- [ ] Todos os imports de `@/lib/late-api` atualizados para `@/lib/platforms/types`

### API Routes
- [ ] `GET /api/profiles` — Lista profiles do workspace
- [ ] `POST /api/profiles` — Cria profile
- [ ] `GET /api/profiles/:id` — Detalhes do profile
- [ ] `PUT /api/profiles/:id` — Atualiza profile
- [ ] `GET /api/accounts` — Lista contas (filtro por profileId)
- [ ] `GET /api/accounts/:id` — Detalhes da conta (sem tokens)
- [ ] `DELETE /api/accounts/:id` — Remove conta
- [ ] `POST /api/accounts/connect` — Placeholder para OAuth
- [ ] `GET /api/accounts/health` — Health check das contas
- [ ] `GET /api/queues` — Lista queues
- [ ] `POST /api/queues` — Cria queue com slots
- [ ] `GET /api/queues/:id` — Detalhes com slots
- [ ] `PUT /api/queues/:id` — Atualiza queue
- [ ] `DELETE /api/queues/:id` — Remove queue
- [ ] `GET /api/queues/preview` — Preview de slots
- [ ] `GET /api/queues/next-slot` — Próximo slot
- [ ] `GET /api/posts` — Lista posts (filtros)
- [ ] `POST /api/posts` — Cria post + PlatformPosts + CronJob
- [ ] `GET /api/posts/:id` — Detalhes com includes
- [ ] `PUT /api/posts/:id` — Atualiza post
- [ ] `DELETE /api/posts/:id` — Remove post (cascade)
- [ ] `POST /api/posts/:id/retry` — Retry de post failed
- [ ] `POST /api/media/upload` — Upload placeholder
- [ ] `POST /api/cron/process` — Pipeline de publicação

### Hook Migration
- [ ] `use-profiles.ts` — Migrado para fetch('/api/profiles')
- [ ] `use-accounts.ts` — Migrado para fetch('/api/accounts')
- [ ] `use-queue.ts` — Migrado para fetch('/api/queues')
- [ ] `use-posts.ts` — Migrado para fetch('/api/posts')
- [ ] `use-media.ts` — Migrado para fetch('/api/media/upload')

### Limpeza
- [ ] `use-late.ts` — Deletado
- [ ] `src/hooks/index.ts` — Atualizado (sem exports de use-late)
- [ ] Nenhum arquivo importa `useLate` ou `useLateClient`

### Verificação
- [ ] `npx prisma generate` — Schema compila
- [ ] `npm run build` — Zero erros
- [ ] `npm run lint` — Zero novos warnings
- [ ] `npx tsc --noEmit` — Zero erros de tipo
- [ ] Middleware: /dashboard sem session → redirect /login
- [ ] Middleware: /api/posts sem session → 401
- [ ] Middleware: / → permite (rota pública)
- [ ] Middleware: /api/cron/process com CRON_SECRET → permite
- [ ] Dashboard home carrega dados (ou vazio se sem dados)
- [ ] Compose page funciona (criar post)
- [ ] Calendar page exibe posts por data
- [ ] Queue page lista/cria/edita queues
- [ ] Accounts page lista contas (vazio se sem contas)
- [ ] Settings page funciona (logout, theme, timezone)
