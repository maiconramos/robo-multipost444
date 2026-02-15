# Fase 7: Public API v1

> **Status:** Plano detalhado. SEM implementação.
> **Pré-requisito:** Fases 3-5 (Core Scheduler, Providers, Storage) concluídas.
> **Objetivo:** Disponibilizar uma API pública para integrações externas (n8n, WordPress, automações) criarem e agendarem posts programaticamente.

---

## 1. Estado Atual (o que existe hoje)

### 1.1. API Interna (Fase 3)

Após a Fase 3, existem API routes internas autenticadas via session cookie:
- `GET/POST /api/posts`
- `GET/PUT/DELETE /api/posts/:id`
- `GET/POST /api/profiles`
- `POST /api/media/upload`
- etc.

**Problema:** Essas routes usam session cookie (Better Auth). Automações externas (n8n, scripts, webhooks) não podem usar cookies — precisam de API keys.

### 1.2. Schema (parcial)

O modelo `Credential` existe e pode armazenar API keys, mas não há um modelo dedicado para API keys da Public API com tracking de uso, prefixo, e hash.

### 1.3. Nenhuma implementação

- ZERO endpoints `/api/public/*`
- ZERO sistema de API keys
- ZERO rate limiting

---

## 2. Arquitetura Alvo

### 2.1. Namespace Separado

```
/api/*              → API interna (auth via session cookie)
/api/public/v1/*    → API pública (auth via API key no header)
```

**Motivo:** Separar namespace evita confusão entre auth mechanisms e permite versionamento independente.

### 2.2. Autenticação via API Key

```
Request:
  POST /api/public/v1/posts
  Headers:
    X-API-Key: rmk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
    Content-Type: application/json

Flow:
  1. Middleware extrai X-API-Key do header
  2. Busca ApiKey no DB pelo prefix + hash
  3. Valida: não expirada, não revogada
  4. Retorna workspace context
  5. Route processa request com workspace-scoped queries
```

### 2.3. Formato de API Key

```
Formato: rmk_{random_32_chars}
Exemplo: rmk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

Armazenamento no DB:
  - prefix: "rmk_a1b2c3d4" (8 chars) — para lookup rápido
  - keyHash: SHA-256 hash da key completa — para validação
  - A key completa NUNCA é armazenada
  - Exibida APENAS uma vez no momento da criação
```

### 2.4. Fluxo de Criação de API Key

```
User no Settings → "API Keys" section
  → Clica "Create API Key"
  → Define nome (ex: "n8n integration")
  → Define expiração (30 dias, 90 dias, 1 ano, nunca)
  → POST /api/workspaces/api-keys { name, expiresAt }
  → API Route:
    1. Gerar key: rmk_{crypto.randomBytes(32).toString('hex').slice(0,32)}
    2. Computar hash: SHA-256(key)
    3. Extrair prefix: key.slice(0, 12)
    4. Salvar ApiKey { workspaceId, name, keyHash, prefix, expiresAt }
    5. Retornar key completa (ÚNICA VEZ)
  → UI: Exibe key com botão "Copy". Warning: "This key won't be shown again"
```

### 2.5. Rate Limiting

```
Padrão: 60 requests/minuto por API key

Implementação: In-memory sliding window (Map<keyPrefix, timestamps[]>)
  - Simples, sem dependência externa
  - Reseta se o processo reiniciar (aceitável para MVP)
  - Futuro: Redis para persistência e multi-instance

Headers de resposta:
  X-RateLimit-Limit: 60
  X-RateLimit-Remaining: 55
  X-RateLimit-Reset: 1706745600
```

---

## 3. Endpoints da Public API v1

### 3.1. Posts

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/public/v1/posts` | Listar posts (filtros: status, profileId, dateFrom, dateTo, page, limit) |
| `POST` | `/api/public/v1/posts` | Criar e/ou agendar post |
| `GET` | `/api/public/v1/posts/:id` | Detalhes de um post (com platformPosts e media) |
| `PUT` | `/api/public/v1/posts/:id` | Atualizar post (content, scheduledFor, etc.) |
| `DELETE` | `/api/public/v1/posts/:id` | Deletar post |

### 3.2. Media

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/public/v1/media` | Upload de mídia (multipart/form-data) |

### 3.3. Profiles

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/public/v1/profiles` | Listar profiles do workspace |

### 3.4. Accounts

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/api/public/v1/accounts` | Listar contas conectadas (sem tokens) |

### 3.5. Detalhes dos Endpoints

#### POST /api/public/v1/posts — Criar Post

**Request:**
```json
{
  "content": "New post content with #hashtags",
  "profileId": "clx...",
  "platforms": [
    {
      "platform": "instagram",
      "accountId": "clx...",
      "customContent": "Instagram-specific text"
    },
    {
      "platform": "twitter",
      "accountId": "clx..."
    }
  ],
  "mediaItems": [
    {
      "type": "image",
      "url": "https://example.com/image.jpg"
    }
  ],
  "scheduledFor": "2025-02-15T10:00:00Z",
  "timezone": "America/Sao_Paulo"
}
```

**Response (201):**
```json
{
  "id": "clx...",
  "content": "New post content with #hashtags",
  "status": "scheduled",
  "scheduledFor": "2025-02-15T10:00:00Z",
  "profileId": "clx...",
  "platformPosts": [
    {
      "id": "clx...",
      "platform": "instagram",
      "accountId": "clx...",
      "status": "pending"
    }
  ],
  "mediaItems": [
    {
      "id": "clx...",
      "type": "image",
      "url": "https://example.com/image.jpg"
    }
  ],
  "createdAt": "2025-02-10T15:30:00Z"
}
```

#### GET /api/public/v1/posts — Listar Posts

**Query Params:**
- `status` — draft, scheduled, publishing, published, failed
- `profileId` — filtrar por profile
- `dateFrom` — ISO date (inclusive)
- `dateTo` — ISO date (inclusive)
- `page` — página (default 1)
- `limit` — items por página (default 20, max 100)

**Response (200):**
```json
{
  "posts": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## 4. Schema Changes

### 4.1. Novo Model: ApiKey

```prisma
model ApiKey {
  id          String    @id @default(cuid())
  workspaceId String
  name        String                // "n8n integration", "WordPress"
  prefix      String                // "rmk_a1b2c3d4" — para lookup
  keyHash     String    @unique     // SHA-256 hash da key completa
  lastUsedAt  DateTime?
  expiresAt   DateTime?             // null = nunca expira
  revokedAt   DateTime?             // null = ativa
  createdAt   DateTime  @default(now())

  workspace Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([prefix])
  @@map("api_key")
}
```

### 4.2. Atualizar Workspace Model

```prisma
model Workspace {
  // ... campos existentes ...
  apiKeys ApiKey[]
}
```

---

## 5. Arquivos a Criar (11 novos)

### 5.1. API Key Management

| Arquivo | Propósito | Detalhes |
|---------|-----------|----------|
| `src/lib/api-keys/index.ts` | CRUD de API keys | `generateApiKey()` → gera key + hash. `validateApiKey(key)` → busca no DB, valida expiração. `revokeApiKey(id)` → marca como revogada |
| `src/lib/api-keys/rate-limit.ts` | Rate limiting | In-memory sliding window. `checkRateLimit(keyPrefix)` → `{ allowed, remaining, resetAt }` |

### 5.2. Public API Middleware

| Arquivo | Propósito | Detalhes |
|---------|-----------|----------|
| `src/lib/api-keys/middleware.ts` | Auth middleware para public API | `authenticateApiKey(request)` → extrai X-API-Key, valida, retorna workspace. Chamado no início de cada route da public API |

### 5.3. Public API Routes

| Arquivo | Propósito | Detalhes |
|---------|-----------|----------|
| `src/app/api/public/v1/posts/route.ts` | Posts CRUD | `GET` — lista. `POST` — cria/agenda |
| `src/app/api/public/v1/posts/[postId]/route.ts` | Post individual | `GET` — detalhes. `PUT` — atualiza. `DELETE` — remove |
| `src/app/api/public/v1/media/route.ts` | Upload de mídia | `POST` — upload via FormData |
| `src/app/api/public/v1/profiles/route.ts` | Profiles | `GET` — lista profiles do workspace |
| `src/app/api/public/v1/accounts/route.ts` | Accounts | `GET` — lista contas (sem tokens) |

### 5.4. API Key Management Route

| Arquivo | Propósito | Detalhes |
|---------|-----------|----------|
| `src/app/api/workspaces/api-keys/route.ts` | Gerenciamento de keys | `GET` — lista API keys do workspace (sem hash). `POST` — cria nova key (retorna key completa). `DELETE` — revoga key |

### 5.5. UI Components

| Arquivo | Propósito | Detalhes |
|---------|-----------|----------|
| `src/app/dashboard/settings/_components/api-keys-card.tsx` | Card de API keys no settings | Lista keys existentes (nome, prefix, lastUsedAt, expiresAt). Botão "Create". Botão "Revoke". Modal de criação com nome e expiração. Exibição única da key após criação |

### 5.6. Documentação

| Arquivo | Propósito |
|---------|-----------|
| `.context/docs/public-api.md` | Documentação da API pública: endpoints, autenticação, exemplos, rate limits |

---

## 6. Arquivos a Modificar (3 existentes)

### 6.1. `prisma/schema.prisma`

**Mudanças:**
- Adicionar model `ApiKey`
- Adicionar relation `apiKeys` no model `Workspace`

### 6.2. `src/middleware.ts`

**Mudanças:**
- Adicionar `/api/public/*` como rota que **NÃO** requer session cookie
- A public API usa API key (validada dentro da route), não session

```typescript
// Rotas públicas (bypass de session):
const publicPaths = [
  "/",
  "/login",
  "/signup",
  "/api/auth",
  "/invite",
  "/api/cron",
  "/api/public",  // ← NOVO: Public API usa sua própria auth
];
```

### 6.3. `src/app/dashboard/settings/page.tsx`

**Mudanças:**
- Importar e renderizar `ApiKeysCard` component
- Adicionar seção "API Keys" no layout de settings

---

## 7. Sub-tarefas Detalhadas

### 7a. Schema + Migration

1. Adicionar model `ApiKey` ao `prisma/schema.prisma`
2. Adicionar relation no `Workspace`
3. `npx prisma migrate dev --name add-api-key`
4. `npx prisma generate`

### 7b. API Key Library

1. Criar `src/lib/api-keys/index.ts`:

```typescript
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export function generateApiKey(): { key: string; prefix: string; keyHash: string } {
  const key = `rmk_${crypto.randomBytes(32).toString("hex").slice(0, 32)}`;
  const prefix = key.slice(0, 12);
  const keyHash = crypto.createHash("sha256").update(key).digest("hex");
  return { key, prefix, keyHash };
}

export async function validateApiKey(key: string): Promise<{ workspaceId: string } | null> {
  const prefix = key.slice(0, 12);
  const keyHash = crypto.createHash("sha256").update(key).digest("hex");

  const apiKey = await prisma.apiKey.findFirst({
    where: {
      prefix,
      keyHash,
      revokedAt: null,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  });

  if (!apiKey) return null;

  // Update lastUsedAt (fire-and-forget)
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return { workspaceId: apiKey.workspaceId };
}

export async function revokeApiKey(id: string, workspaceId: string): Promise<void> {
  await prisma.apiKey.update({
    where: { id, workspaceId },
    data: { revokedAt: new Date() },
  });
}
```

### 7c. Rate Limiting

1. Criar `src/lib/api-keys/rate-limit.ts`:

```typescript
const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000");
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || "60");
const store = new Map<string, number[]>();

export function checkRateLimit(identifier: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const windowStart = now - windowMs;

  // Get or create timestamps array
  let timestamps = store.get(identifier) || [];

  // Remove expired timestamps
  timestamps = timestamps.filter((t) => t > windowStart);

  const remaining = Math.max(0, maxRequests - timestamps.length);
  const allowed = timestamps.length < maxRequests;

  if (allowed) {
    timestamps.push(now);
  }

  store.set(identifier, timestamps);

  return {
    allowed,
    remaining: allowed ? remaining - 1 : 0,
    resetAt: Math.ceil((windowStart + windowMs) / 1000),
  };
}

// Cleanup de entries antigas a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of store.entries()) {
    const valid = timestamps.filter((t) => t > now - windowMs);
    if (valid.length === 0) store.delete(key);
    else store.set(key, valid);
  }
}, 5 * 60 * 1000);
```

### 7d. Auth Middleware para Public API

1. Criar `src/lib/api-keys/middleware.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "./index";
import { checkRateLimit } from "./rate-limit";

export async function authenticatePublicApi(request: NextRequest): Promise<
  { workspaceId: string } | NextResponse
> {
  const apiKey = request.headers.get("X-API-Key");

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing X-API-Key header" },
      { status: 401 }
    );
  }

  // Validate key
  const result = await validateApiKey(apiKey);
  if (!result) {
    return NextResponse.json(
      { error: "Invalid or expired API key" },
      { status: 401 }
    );
  }

  // Rate limit
  const prefix = apiKey.slice(0, 12);
  const rateLimit = checkRateLimit(prefix);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded" },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": String(maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rateLimit.resetAt),
          "Retry-After": String(Math.ceil((rateLimit.resetAt * 1000 - Date.now()) / 1000)),
        },
      }
    );
  }

  return { workspaceId: result.workspaceId };
}
```

### 7e. Public API Routes

Cada route segue este padrão:

```typescript
export async function GET(request: NextRequest) {
  const authResult = await authenticatePublicApi(request);
  if (authResult instanceof NextResponse) return authResult;

  const { workspaceId } = authResult;

  // ... query com workspaceId scope ...

  return NextResponse.json({ ... }, {
    headers: {
      "X-RateLimit-Remaining": "...",
    },
  });
}
```

As routes da public API reutilizam a mesma lógica das routes internas, mas com auth via API key em vez de session.

### 7f. API Key Management Route

1. `GET /api/workspaces/api-keys`:
   - Lista keys do workspace (nome, prefix, lastUsedAt, expiresAt, revokedAt)
   - **Nunca** retorna keyHash

2. `POST /api/workspaces/api-keys`:
   - Body: `{ name, expiresIn?: "30d" | "90d" | "1y" | "never" }`
   - Gera key
   - Salva no DB
   - Retorna key completa (ÚNICA VEZ)

3. `DELETE /api/workspaces/api-keys/:id`:
   - Revoga key (set revokedAt)

### 7g. UI de API Keys

1. `api-keys-card.tsx`:
   - Tabela com keys existentes: nome, prefix (`rmk_a1b2****`), último uso, expiração, status
   - Botão "Create New Key" → modal
   - Modal de criação: nome, expiração, botão "Create"
   - Após criação: exibe key completa com botão "Copy" e warning
   - Botão "Revoke" em cada key → confirmação → `DELETE /api/workspaces/api-keys/:id`

---

## 8. Ordem de Implementação

```
7.1 — Schema: adicionar model ApiKey
7.2 — Migration: npx prisma migrate dev
7.3 — API key library (generate, validate, revoke)
7.4 — Rate limiting
7.5 — Auth middleware para public API
7.6 — Atualizar middleware.ts (bypass session para /api/public/*)
7.7 — Public API: GET/POST /api/public/v1/posts
7.8 — Public API: GET/PUT/DELETE /api/public/v1/posts/:id
7.9 — Public API: POST /api/public/v1/media
7.10 — Public API: GET /api/public/v1/profiles
7.11 — Public API: GET /api/public/v1/accounts
7.12 — API key management route
7.13 — UI: api-keys-card no settings
7.14 — Documentação (.context/docs/public-api.md)
7.15 — Verificar build, lint, types
```

---

## 9. Variáveis de Ambiente

```env
# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000       # Janela em ms (default: 1 minuto)
RATE_LIMIT_MAX_REQUESTS=60       # Max requests por janela (default: 60)
```

---

## 10. Decisões de Design

### D1: Formato da API key?

**Recomendação:** `rmk_` prefix + 32 caracteres hex aleatórios.
**Motivo:** Prefix `rmk_` (Robo MultiPost Key) identifica a key. 32 chars = 128 bits de entropia. Fácil de reconhecer em logs.

### D2: Armazenar key ou hash?

**Recomendação:** Armazenar apenas SHA-256 hash + prefix. A key completa é retornada APENAS uma vez.
**Motivo:** Segurança — se o DB for comprometido, as keys não podem ser recuperadas.

### D3: Rate limit in-memory ou Redis?

**Recomendação:** In-memory para MVP. Redis para multi-instance (futuro).
**Motivo:** Sem dependência externa. Reseta no restart (aceitável). Fácil de substituir por Redis depois.

### D4: Versionamento da API?

**Recomendação:** `/api/public/v1/*` — versão no path.
**Motivo:** Permite v2 no futuro sem quebrar integrações existentes.

### D5: Quem pode criar API keys?

**Recomendação:** OWNER e ADMIN do workspace.
**Motivo:** API keys dão acesso completo ao workspace. Apenas roles privilegiadas devem gerenciar.

### D6: Limites por workspace ou por key?

**Recomendação:** Por key (cada key tem seu own rate limit).
**Motivo:** Permite múltiplas integrações sem conflito de rate limit entre elas.

---

## 11. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| API key vazada | ALTO | Key não recuperável do DB (hash only). Botão "Revoke" na UI. Documentar boas práticas |
| Rate limit insuficiente para uso legítimo | MÉDIO | Configurável via env var. Mensagens claras no 429 |
| In-memory rate limit perde state no restart | BAIXO | Aceitável para MVP. Redis como upgrade futuro |
| Public API usada para spam | MÉDIO | Rate limiting. Logs de uso. Futuro: IP blocking |
| Confusão entre API interna e pública | BAIXO | Namespace separado (/api/public/v1/). Documentação clara |
| Performance: lookup de API key a cada request | BAIXO | Index no prefix. Key validation é O(1) com hash comparison |

---

## 12. Exemplos de Uso

### 12.1. n8n Integration

```javascript
// n8n HTTP Request Node
// Method: POST
// URL: https://myapp.vercel.app/api/public/v1/posts
// Headers:
//   X-API-Key: rmk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
//   Content-Type: application/json
// Body:
{
  "content": "{{ $json.caption }}",
  "profileId": "clx123...",
  "platforms": [
    { "platform": "instagram", "accountId": "clx456..." }
  ],
  "mediaItems": [
    { "type": "image", "url": "{{ $json.imageUrl }}" }
  ],
  "scheduledFor": "{{ $json.scheduledDate }}"
}
```

### 12.2. cURL

```bash
# Criar post agendado
curl -X POST https://myapp.vercel.app/api/public/v1/posts \
  -H "X-API-Key: rmk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello from the API!",
    "profileId": "clx123",
    "platforms": [{"platform": "twitter", "accountId": "clx456"}],
    "scheduledFor": "2025-02-15T10:00:00Z"
  }'

# Listar posts
curl https://myapp.vercel.app/api/public/v1/posts?status=scheduled \
  -H "X-API-Key: rmk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"
```

---

## 13. Checklist Final — Fase 7

### Schema
- [ ] Model `ApiKey` adicionado ao schema.prisma
- [ ] Migration executada com sucesso
- [ ] `npx prisma generate` — Schema compila

### API Key Management
- [ ] `src/lib/api-keys/index.ts` — generate, validate, revoke funcionais
- [ ] `src/lib/api-keys/rate-limit.ts` — Sliding window funcional
- [ ] `src/lib/api-keys/middleware.ts` — Auth para public API
- [ ] API key gerada tem formato `rmk_...` (36 chars total)
- [ ] Key armazenada como hash (não pode ser recuperada do DB)

### Public API Routes
- [ ] `GET /api/public/v1/posts` — Lista posts com filtros
- [ ] `POST /api/public/v1/posts` — Cria post/agenda
- [ ] `GET /api/public/v1/posts/:id` — Detalhes do post
- [ ] `PUT /api/public/v1/posts/:id` — Atualiza post
- [ ] `DELETE /api/public/v1/posts/:id` — Remove post
- [ ] `POST /api/public/v1/media` — Upload de mídia
- [ ] `GET /api/public/v1/profiles` — Lista profiles
- [ ] `GET /api/public/v1/accounts` — Lista contas

### API Key Routes (Internal)
- [ ] `GET /api/workspaces/api-keys` — Lista keys
- [ ] `POST /api/workspaces/api-keys` — Cria key
- [ ] `DELETE /api/workspaces/api-keys/:id` — Revoga key

### UI
- [ ] `api-keys-card.tsx` — Card funcional no settings
- [ ] Criação de key mostra key completa uma vez
- [ ] Revogação funciona com confirmação

### Integration
- [ ] middleware.ts atualizado (bypass session para /api/public/*)
- [ ] Rate limit headers retornados nas responses
- [ ] 429 retornado quando rate limit excedido

### Verificação
- [ ] `npm run build` — Zero erros
- [ ] `npm run lint` — Zero novos warnings
- [ ] `npx tsc --noEmit` — Zero erros de tipo
- [ ] Sem API key: GET /api/public/v1/posts → 401
- [ ] Com API key válida: GET /api/public/v1/posts → 200
- [ ] Com API key expirada: → 401
- [ ] Com API key revogada: → 401
- [ ] Rate limit: 61 requests em 1 min → 429
- [ ] Criar post via cURL → post aparece no dashboard
- [ ] lastUsedAt atualizado após uso da key
- [ ] Nenhum hash/key exposto nas responses da list

### Documentação
- [ ] `.context/docs/public-api.md` — Endpoints, auth, exemplos, rate limits
