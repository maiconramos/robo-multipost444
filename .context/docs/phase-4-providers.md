# Fase 4: Providers (Late + BYO Multi-Platform)

> **Status:** Plano detalhado. SEM implementação.
> **Pré-requisito:** Fase 3 (Core Scheduler + Hook Migration) concluída.
> **Objetivo:** Implementar o sistema de providers para publicação em redes sociais — LateProvider (Late SDK server-side) e BYOProvider (APIs diretas) para 8 plataformas.

---

## 1. Estado Atual (o que existe hoje)

### 1.1. Schema Prisma (pronto)

```prisma
model SocialAccount {
  id              String    @id @default(cuid())
  workspaceId     String
  profileId       String
  platform        String    // instagram, tiktok, youtube, etc.
  platformUserId  String?
  username        String
  displayName     String?
  profilePicture  String?
  isActive        Boolean   @default(true)
  providerType    String    // "late" | "byo"

  // Late mode
  lateAccountId   String?

  // BYO mode (encrypted tokens)
  accessTokenEnc  String?
  refreshTokenEnc String?
  tokenExpiresAt  DateTime?
  oauthMetadata   Json?     // non-sensitive OAuth metadata
  // ...
}

model Credential {
  id          String @id @default(cuid())
  workspaceId String
  type        String // "late_api_key", "storage_config"
  keyEnc      String // AES-256-GCM encrypted value
  metadata    Json?
  @@unique([workspaceId, type])
}
```

### 1.2. Callback Page (parcial)

- `src/app/callback/page.tsx` — Existe
- `src/app/callback/_components/callback-client.tsx` — Existe, mas usa Late SDK para processar callback
- Precisa ser adaptado para suportar BYO callbacks

### 1.3. Late API Client (server-side)

```typescript
// src/lib/late-api/client.ts — Pronto para uso
export function createLateClient(apiKey?: string): Late {
  const key = apiKey || process.env.LATE_API_KEY;
  return new Late({ apiKey: key });
}
```

### 1.4. Encryption (pronto)

```typescript
// src/lib/encryption.ts
export function encrypt(plaintext: string): string { ... }
export function decrypt(encryptedValue: string): string { ... }
```

### 1.5. Platform Types (movidos na Fase 3)

```typescript
// src/lib/platforms/types.ts (movido de late-api/types.ts na Fase 3)
export type Platform = "instagram" | "tiktok" | "youtube" | ...
export interface TikTokPlatformData { ... }
export interface InstagramPlatformData { ... }
// etc.
```

### 1.6. Cron Pipeline (Fase 3 — com placeholder)

O cron pipeline existe em `src/app/api/cron/process/route.ts` mas chama um placeholder para `publishPost()`. Esta fase substitui o placeholder pela implementação real.

---

## 2. Referência ao /research

### 2.1. Arquivos de Referência

O diretório `research/postiz-app-only-example/libraries/nestjs-libraries/src/integrations/social/` contém providers para todas as plataformas alvo. **Usar como referência comportamental APENAS — não copiar código.**

| Arquivo de Referência | Plataforma | Tamanho | Notas |
|----------------------|------------|---------|-------|
| `instagram.provider.ts` | Instagram | 21.4 KB | Graph API, container-based publishing |
| `facebook.provider.ts` | Facebook | ~15 KB | Pages API, foto/vídeo/texto |
| `youtube.provider.ts` | YouTube | 14.5 KB | Resumable upload, Data API v3 |
| `linkedin.provider.ts` | LinkedIn | 22.6 KB | UGC Posts API, image upload |
| `linkedin.page.provider.ts` | LinkedIn Pages | 25.4 KB | Company page posts |
| `tiktok.provider.ts` | TikTok | 22.7 KB | Content Posting API, video chunks |
| `pinterest.provider.ts` | Pinterest | 12.4 KB | Pins API v5 |
| `x.provider.ts` | X/Twitter | 19.5 KB | API v2, media upload |
| `threads.provider.ts` | Threads | 15.9 KB | Meta Threads API |

### 2.2. Interface de Referência

```
// research/.../social.integrations.interface.ts
IAuthenticator:
  - authenticate(params) → tokens
  - refreshToken(refreshToken) → newTokens
  - generateAuthUrl(state) → authorizationUrl

ISocialMediaIntegration:
  - post(postDetails) → postResult

SocialProvider (extends both):
  - identifier: string
  - name: string
  - scopes: string[]
  - maxLength(): number
```

### 2.3. Padrões a Observar (sem copiar)

- **OAuth flow multi-step:** Facebook/LinkedIn requerem entity selection (qual Page/Company)
- **Token refresh:** Todas as plataformas BYO precisam de refresh automático
- **Upload em chunks:** YouTube e TikTok usam upload resumable para vídeos
- **Container-based publish:** Instagram usa container → publish pattern (create media container → wait → publish)
- **Rate limits:** Cada plataforma tem limites diferentes

---

## 3. Arquitetura Alvo

### 3.1. PostingProvider Interface

```typescript
// src/lib/providers/types.ts

export interface PublishResult {
  success: boolean;
  platformPostId?: string;    // ID no platform (ex: Instagram media ID)
  platformPostUrl?: string;   // URL do post publicado
  error?: string;
  errorCode?: string;
}

export interface TokenData {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
  metadata?: Record<string, unknown>;
}

export interface AuthUrlResult {
  url: string;
  state: string;              // CSRF state parameter
  codeVerifier?: string;      // PKCE code verifier (Twitter)
}

export interface PostingProvider {
  /**
   * Publish a post to a specific platform account.
   */
  publishPost(
    post: Post & { mediaItems: MediaItem[] },
    platformPost: PlatformPost & { account: SocialAccount },
  ): Promise<PublishResult>;

  /**
   * Generate OAuth authorization URL for connecting an account.
   */
  getAuthUrl(
    platform: Platform,
    profileId: string,
    redirectUrl: string,
    workspaceId: string,
  ): Promise<AuthUrlResult>;

  /**
   * Handle OAuth callback — exchange code for tokens, create SocialAccount.
   */
  handleCallback(
    platform: Platform,
    code: string,
    state: string,
    workspaceId: string,
    profileId: string,
  ): Promise<SocialAccount>;

  /**
   * Refresh expired tokens for a BYO account.
   */
  refreshToken(account: SocialAccount): Promise<TokenData>;

  /**
   * Validate that a connection is still active.
   */
  validateConnection(account: SocialAccount): Promise<boolean>;
}
```

### 3.2. Provider Factory

```typescript
// src/lib/providers/index.ts

export async function getProvider(workspaceId: string): Promise<PostingProvider> {
  // 1. Check if workspace has Late API key in Credential table
  const lateCredential = await prisma.credential.findUnique({
    where: { workspaceId_type: { workspaceId, type: "late_api_key" } },
  });

  if (lateCredential) {
    const apiKey = decrypt(lateCredential.keyEnc);
    return new LateProvider(apiKey);
  }

  // 2. Default to BYO provider
  return new BYOProvider(workspaceId);
}
```

### 3.3. Fluxo de Publicação

```
Cron Process (/api/cron/process)
  → Busca CronJob pendente
  → Busca Post + PlatformPosts + SocialAccounts
  → getProvider(workspaceId)
  → Para cada PlatformPost:
    → Se account.providerType === "late":
      → LateProvider.publishPost(post, platformPost)
        → Late SDK: late.posts.createPost(...)
    → Se account.providerType === "byo":
      → BYOProvider.publishPost(post, platformPost)
        → Seleciona sub-provider pela plataforma
        → Ex: InstagramBYO.publish(post, account)
          → Graph API: criar container → publicar
```

### 3.4. Fluxo OAuth (Conexão de Conta BYO)

```
1. User clica "Connect Instagram" na UI
2. Frontend: POST /api/accounts/connect { platform: "instagram", profileId }
3. API Route:
   → getProvider(workspaceId)
   → provider.getAuthUrl("instagram", profileId, redirectUrl, workspaceId)
   → Retorna { url, state }
4. Frontend: window.open(url) ou redirect
5. User autoriza no Instagram
6. Instagram redireciona para /callback?code=XXX&state=YYY
7. Callback Page:
   → POST /api/accounts/callback { platform, code, state }
8. API Route:
   → getProvider(workspaceId)
   → provider.handleCallback(platform, code, state, workspaceId, profileId)
   → Troca code por tokens
   → Encripta tokens com encrypt()
   → Cria SocialAccount no DB
   → Retorna conta criada
9. Frontend: redirect para /dashboard/accounts
```

---

## 4. Arquivos a Criar (17 novos)

### 4.1. Provider Core

| Arquivo | Propósito | Detalhes |
|---------|-----------|----------|
| `src/lib/providers/types.ts` | Interfaces | PostingProvider, PublishResult, TokenData, AuthUrlResult |
| `src/lib/providers/index.ts` | Factory | `getProvider(workspaceId)` — retorna LateProvider ou BYOProvider |
| `src/lib/providers/late-provider.ts` | Late SDK provider | Decripta Late API key do Credential. Delega para Late SDK server-side. Implementa PublishPost, getAuthUrl (via Late connect), handleCallback |

### 4.2. BYO Provider Base

| Arquivo | Propósito | Detalhes |
|---------|-----------|----------|
| `src/lib/providers/byo/base.ts` | Classe base BYO | Abstract class com helpers comuns: token refresh, HTTP helpers, error handling. Registry de sub-providers por plataforma |
| `src/lib/providers/byo/registry.ts` | Registry de plataformas | Mapeia `Platform` → sub-provider class. `getPlatformProvider(platform)` |

### 4.3. BYO Sub-Providers (8 plataformas)

| Arquivo | Plataforma | API | Scopes OAuth | Tipo Post MVP |
|---------|------------|-----|--------------|---------------|
| `src/lib/providers/byo/instagram.ts` | Instagram | Meta Graph API v21 | `instagram_basic`, `instagram_content_publish`, `pages_show_list` | Imagem + legenda |
| `src/lib/providers/byo/facebook.ts` | Facebook Page | Meta Graph API v21 | `pages_manage_posts`, `pages_read_engagement` | Texto + imagem (Page) |
| `src/lib/providers/byo/youtube.ts` | YouTube | YouTube Data API v3 | `https://www.googleapis.com/auth/youtube.upload` | Upload de vídeo |
| `src/lib/providers/byo/linkedin.ts` | LinkedIn | LinkedIn Marketing API (v2) | `w_member_social`, `r_liteprofile` | Texto + imagem (UGC Post) |
| `src/lib/providers/byo/tiktok.ts` | TikTok | Content Posting API | `video.publish`, `video.upload` | Upload de vídeo |
| `src/lib/providers/byo/pinterest.ts` | Pinterest | Pinterest API v5 | `boards:read`, `pins:write` | Pin (imagem + link) |
| `src/lib/providers/byo/twitter.ts` | X/Twitter | X API v2 | `tweet.write`, `users.read`, `offline.access` | Texto + imagem |
| `src/lib/providers/byo/threads.ts` | Threads | Threads API (Meta) | `threads_basic`, `threads_content_publish` | Texto + imagem |

### 4.4. API Routes

| Arquivo | Propósito | Detalhes |
|---------|-----------|----------|
| `src/app/api/accounts/connect/[platform]/route.ts` | OAuth por plataforma | `POST` — gera URL de autorização OAuth para a plataforma. Salva state em session/DB para validação |
| `src/app/api/accounts/callback/route.ts` | Callback OAuth | `POST { platform, code, state }` — troca code por tokens, encripta, cria SocialAccount |

### 4.5. Documentação

| Arquivo | Propósito |
|---------|-----------|
| `.context/docs/providers.md` | Como o sistema de providers funciona, como adicionar nova plataforma BYO |

---

## 5. Arquivos a Modificar (4 existentes)

### 5.1. `src/app/api/cron/process/route.ts`

**Antes:** Placeholder que marca posts como published sem chamar provider.
**Depois:** Chama `getProvider(workspaceId)` e `provider.publishPost()` real.

**Mudanças concretas:**
- Importar `getProvider` de `@/lib/providers`
- Substituir placeholder por:
  ```typescript
  const provider = await getProvider(post.workspaceId);
  const result = await provider.publishPost(post, platformPost);
  ```
- Tratar resultado (success/failure) e atualizar PlatformPost

### 5.2. `src/app/api/accounts/connect/route.ts`

**Antes (Fase 3):** Retorna 501 "Not implemented".
**Depois:** Chama `provider.getAuthUrl(platform, ...)`.

**Mudanças:**
- Importar `getProvider`
- Body: `{ platform, profileId }`
- Chamar provider.getAuthUrl() com redirectUrl = `${BETTER_AUTH_URL}/callback`
- Retornar `{ url, state }`

### 5.3. `src/app/callback/_components/callback-client.tsx`

**Antes:** Processa callback via Late SDK.
**Depois:** Envia code+state para `/api/accounts/callback` que processa server-side.

**Mudanças:**
- Extrair `code`, `state`, `platform` dos query params
- POST para `/api/accounts/callback` com esses dados
- Exibir loading/success/error
- Redirect para `/dashboard/accounts` após sucesso

### 5.4. `src/app/dashboard/settings/page.tsx`

**Mudanças:**
- Adicionar card "Provider Configuration"
- Form para inserir Late API key (salva como Credential encriptada via API route)
- Toggle entre modo Late e modo BYO
- API route para salvar: `POST /api/credentials { type: "late_api_key", value }`

---

## 6. Detalhes por Plataforma BYO

### 6.1. Instagram (Graph API)

**Referência:** `research/.../instagram.provider.ts` (padrão comportamental)

**Fluxo OAuth:**
1. Redirect para `https://www.facebook.com/dialog/oauth?client_id=X&redirect_uri=Y&scope=instagram_basic,instagram_content_publish,pages_show_list&state=Z`
2. Callback: exchange code por access token
3. **Entity Selection:** Listar Instagram Business Accounts vinculadas às Facebook Pages do user
4. User seleciona qual conta → salvar `platformUserId` (Instagram Business Account ID)

**Fluxo de Publicação (imagem):**
1. Create media container: `POST /{ig-user-id}/media?image_url=X&caption=Y`
2. Verificar status do container: `GET /{container-id}?fields=status_code`
3. Publish: `POST /{ig-user-id}/media_publish?creation_id={container-id}`
4. Retornar media ID como `platformPostId`

**Requisitos:**
- Instagram Business Account ou Creator Account
- Facebook Page vinculada
- App com permissões aprovadas (Instagram Content Publishing)

### 6.2. Facebook Page (Graph API)

**Referência:** `research/.../facebook.provider.ts`

**Fluxo OAuth:**
1. Redirect para Facebook OAuth com scope `pages_manage_posts,pages_read_engagement`
2. Callback: exchange code → user access token
3. **Entity Selection:** `GET /me/accounts` → listar Pages do user
4. Exchange user token por Page token: `GET /{page-id}?fields=access_token`
5. Salvar Page access token (long-lived)

**Fluxo de Publicação:**
- Texto: `POST /{page-id}/feed?message=X`
- Imagem: `POST /{page-id}/photos?url=X&caption=Y`
- Vídeo: `POST /{page-id}/videos?file_url=X&description=Y`

### 6.3. YouTube (Data API v3)

**Referência:** `research/.../youtube.provider.ts`

**Fluxo OAuth:**
1. Redirect para Google OAuth com scope `youtube.upload`
2. Callback: exchange code → access_token + refresh_token

**Fluxo de Publicação:**
1. Upload resumable: `POST https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable`
2. Upload chunks do vídeo
3. Set metadata: title, description, privacy
4. Retornar video ID

**Nota:** Requer vídeo — não suporta post de texto/imagem.

### 6.4. LinkedIn (Marketing API)

**Referência:** `research/.../linkedin.provider.ts`

**Fluxo OAuth:**
1. Redirect para LinkedIn OAuth com scope `w_member_social,r_liteprofile`
2. Callback: exchange code → access_token

**Fluxo de Publicação:**
- Texto: `POST /rest/posts` com body UGC
- Imagem: Upload para `POST /rest/images?action=initializeUpload` → PUT binary → `POST /rest/posts` com image URN
- **Entity Selection (Companies):** Se LinkedIn Page, usar `r_organization_admin` scope

### 6.5. TikTok (Content Posting API)

**Referência:** `research/.../tiktok.provider.ts`

**Fluxo OAuth:**
1. Redirect para TikTok OAuth com scope `video.publish,video.upload`
2. Callback: exchange code → access_token + refresh_token (refresh via `POST /oauth/v2/token`)

**Fluxo de Publicação:**
1. Init upload: `POST /v2/post/publish/video/init/`
2. Upload video chunks
3. Publish: `POST /v2/post/publish/content/publish/`
4. Check status (async): `POST /v2/post/publish/status/fetch/`

**Nota:** TikTok é APENAS vídeo. Requer review do app.

### 6.6. Pinterest (API v5)

**Referência:** `research/.../pinterest.provider.ts`

**Fluxo OAuth:**
1. Redirect para Pinterest OAuth com scope `boards:read,pins:write`
2. Callback: exchange code → access_token + refresh_token

**Fluxo de Publicação:**
1. **Entity Selection:** Listar boards do user: `GET /v5/boards`
2. Create pin: `POST /v5/pins` com `{ board_id, title, description, media_source: { source_type: "image_url", url } }`

### 6.7. X/Twitter (API v2)

**Referência:** `research/.../x.provider.ts`

**Fluxo OAuth (PKCE):**
1. Gerar `code_verifier` + `code_challenge` (S256)
2. Redirect para `https://twitter.com/i/oauth2/authorize?client_id=X&code_challenge=Y&scope=tweet.write+users.read+offline.access&state=Z`
3. Callback: exchange code + code_verifier → access_token + refresh_token

**Fluxo de Publicação:**
- Texto: `POST https://api.x.com/2/tweets` com `{ text }`
- Com imagem:
  1. Upload: `POST https://upload.twitter.com/1.1/media/upload.json` (chunked)
  2. Tweet: `POST /2/tweets` com `{ text, media: { media_ids: ["..."] } }`

### 6.8. Threads (Meta API)

**Referência:** `research/.../threads.provider.ts`

**Fluxo OAuth:**
1. Redirect para Threads OAuth: `https://threads.net/oauth/authorize?client_id=X&scope=threads_basic,threads_content_publish`
2. Callback: exchange code → access_token

**Fluxo de Publicação (similar ao Instagram):**
1. Create container: `POST /{user-id}/threads?media_type=TEXT&text=X` (ou IMAGE + image_url)
2. Publish: `POST /{user-id}/threads_publish?creation_id={container-id}`

---

## 7. Sub-tarefas Detalhadas

### 7a. Provider Interface + Factory

1. Criar `src/lib/providers/types.ts` com interfaces
2. Criar `src/lib/providers/index.ts` com `getProvider(workspaceId)`
3. Testar: factory retorna LateProvider ou BYOProvider conforme Credential

### 7b. LateProvider

1. Criar `src/lib/providers/late-provider.ts`:
   - Constructor recebe `apiKey` (já decriptado)
   - `publishPost()`: Usa `createLateClient(apiKey).posts.createPost()`
   - `getAuthUrl()`: Usa `late.connect.getConnectUrl()`
   - `handleCallback()`: Cria SocialAccount com `providerType: "late"`, `lateAccountId`
   - `refreshToken()`: Late gerencia tokens — não faz nada
   - `validateConnection()`: Chama Late API para verificar

**Verificação:**
```bash
# Com Late API key configurada:
# 1. Connect account via Late → SocialAccount criado
# 2. Cron publish → Late SDK publica post
```

### 7c. BYO Base + Registry

1. Criar `src/lib/providers/byo/base.ts`:
   - Abstract class `BaseBYOProvider`
   - Helpers: `httpGet()`, `httpPost()`, `httpPostFormData()`
   - Token refresh logic: verificar `tokenExpiresAt`, chamar `refreshToken()` se necessário
   - Decrypt token helper: `getAccessToken(account)` → `decrypt(account.accessTokenEnc)`

2. Criar `src/lib/providers/byo/registry.ts`:
   - Map de `Platform` → provider class
   - `getPlatformProvider(platform)` → instância do sub-provider

### 7d. BYO Sub-Providers (por ordem de complexidade)

**Ordem recomendada:**

1. **Threads** (mais simples — API similar a Instagram, sem entity selection)
2. **Twitter/X** (texto + imagem, PKCE OAuth)
3. **Instagram** (container-based publish, entity selection)
4. **Facebook Page** (entity selection, Page tokens)
5. **LinkedIn** (UGC Posts, image upload)
6. **Pinterest** (board selection, Pin API)
7. **YouTube** (resumable upload — mais complexo)
8. **TikTok** (chunked upload, async status — mais complexo)

Para cada sub-provider:
1. Implementar `generateAuthUrl()` com scopes corretos
2. Implementar `handleCallback()` — exchange code, criar SocialAccount
3. Implementar `publish()` — postar conteúdo
4. Implementar `refreshToken()` — renovar tokens
5. Testar end-to-end com conta real

### 7e. OAuth Flow Completo

1. Atualizar `src/app/api/accounts/connect/route.ts` (ou `/[platform]/route.ts`):
   - Chamar `provider.getAuthUrl(platform, ...)`
   - Salvar `state` e `codeVerifier` (se PKCE) em cookie/session

2. Criar `src/app/api/accounts/callback/route.ts`:
   - Ler `code`, `state` dos params
   - Validar `state` (CSRF)
   - Chamar `provider.handleCallback(platform, code, state, workspaceId, profileId)`
   - Retornar conta criada

3. Atualizar callback page para chamar API route em vez de Late SDK

### 7f. Integrar com Cron Pipeline

1. Atualizar `src/app/api/cron/process/route.ts`:
   - Substituir placeholder por `getProvider()` + `provider.publishPost()`
   - Tratar token refresh antes de publicar:
     ```
     Se account.tokenExpiresAt < now:
       newTokens = await provider.refreshToken(account)
       Atualizar SocialAccount com novos tokens encriptados
     ```

### 7g. Credential Management

1. Criar `src/app/api/credentials/route.ts`:
   - `POST { type, value }` — encripta `value` e salva como Credential
   - `GET` — lista credentials do workspace (sem valores)
   - `DELETE` — remove credential

2. Atualizar settings page para gerenciar Late API key

---

## 8. Ordem de Implementação

```
Etapa 1 — Core:
  4.1 — Provider types (interfaces)
  4.2 — Provider factory (getProvider)
  4.3 — LateProvider
  4.4 — BYO base class + registry

Etapa 2 — BYO Providers (imagem/texto primeiro):
  4.5 — Threads BYO (mais simples)
  4.6 — Twitter/X BYO
  4.7 — Instagram BYO
  4.8 — Facebook Page BYO
  4.9 — LinkedIn BYO
  4.10 — Pinterest BYO

Etapa 3 — BYO Providers (vídeo):
  4.11 — YouTube BYO
  4.12 — TikTok BYO

Etapa 4 — Integration:
  4.13 — OAuth flow (connect + callback routes)
  4.14 — Credential management (API route + settings UI)
  4.15 — Integrar providers com cron pipeline
  4.16 — Entity selection UI (Facebook Pages, LinkedIn Companies, Pinterest Boards)

Etapa 5 — Docs:
  4.17 — Documentação (.context/docs/providers.md)
  4.18 — Verificar build, lint, types
```

---

## 9. Variáveis de Ambiente

### Novas por Plataforma BYO

Cada plataforma BYO requer que o usuário configure um "app" no developer portal da rede. As credenciais do app (client_id, client_secret) ficam armazenadas como Credentials encriptadas no DB, **NÃO em env vars**.

No entanto, para simplificar o setup self-hosted, pode-se oferecer env vars opcionais:

```env
# Opcionais — se não definidos, user configura via UI/Credential
INSTAGRAM_CLIENT_ID=
INSTAGRAM_CLIENT_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
PINTEREST_APP_ID=
PINTEREST_APP_SECRET=
THREADS_APP_ID=
THREADS_APP_SECRET=
```

**Nota:** Instagram e Threads usam a mesma Facebook/Meta App. Facebook Pages também. Então na prática:
- `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` cobre Instagram, Facebook, e Threads
- Os demais são independentes

---

## 10. Decisões de Design

### D1: Um provider por workspace ou por conta?

**Recomendação:** Um provider por workspace (factory decision), mas cada SocialAccount indica `providerType` ("late" | "byo").
**Motivo:** Workspace pode ter mix de contas Late e BYO. O factory retorna o provider adequado, e o publish loop verifica `account.providerType`.

**Implicação:** Na prática, o cron pipeline faz:
```
Se account.providerType === "late" → usa LateProvider
Se account.providerType === "byo" → usa BYOProvider (que seleciona sub-provider)
```

### D2: Onde armazenar OAuth state?

**Recomendação:** Cookie httpOnly temporário (`oauth_state`) com TTL de 10 minutos.
**Alternativa:** DB (tabela temporária). Mais seguro mas mais complexo.
**Motivo:** Cookie é stateless e funciona sem tabela extra.

### D3: Entity selection (Facebook Pages, LinkedIn Companies)?

**Recomendação:** Multi-step OAuth — após callback, se a plataforma requer entity selection, redirecionar para `/callback/select-entity?platform=X` com lista de entidades. User seleciona → finaliza criação da SocialAccount.
**Motivo:** Plataformas como Facebook/LinkedIn/Pinterest retornam múltiplas entidades (Pages, Companies, Boards).

### D4: App credentials — env vars ou DB?

**Recomendação:** Ambos. Prioridade:
1. Buscar `Credential(type: "{platform}_client_id")` no DB
2. Fallback para env var `{PLATFORM}_CLIENT_ID`
**Motivo:** Flexibilidade para self-hosted. Env vars são mais fáceis para deploy simples. DB permite gerenciamento via UI.

### D5: Como tratar plataformas que requerem app review?

**Recomendação:** Documentar quais plataformas requerem review (Instagram, TikTok) e quais não (Twitter, LinkedIn). Para plataformas com review pendente, sugerir usar modo Late.
**Motivo:** BYO para Instagram/TikTok requer que o app do usuário tenha Advanced Access aprovado pela Meta/TikTok.

---

## 11. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| OAuth token expira durante publish | MÉDIO | Refresh automático antes de publicar. Verificar `tokenExpiresAt` |
| API da plataforma muda (breaking change) | ALTO | Isolar cada provider. Versionar endpoints. Monitorar changelogs |
| Entity selection não tratada corretamente | MÉDIO | Multi-step flow com UI dedicada. Testar com contas reais |
| Rate limit da plataforma | MÉDIO | Respeitar headers de rate limit. Exponential backoff. Log warnings |
| Upload de vídeo falha (YouTube, TikTok) | ALTO | Resumable uploads. Retry com chunks. Timeout generoso |
| App BYO não tem permissões suficientes | MÉDIO | Validar scopes no callback. Mensagem de erro clara para o usuário |
| PKCE flow (Twitter) diferente do OAuth padrão | BAIXO | Implementar PKCE especificamente para Twitter. Code verifier em cookie |
| Tokens armazenados podem ser comprometidos se ENCRYPTION_KEY vazar | ALTO | Documentar importância do ENCRYPTION_KEY. Nunca logar tokens. |

---

## 12. Checklist Final — Fase 4

### Provider Core
- [ ] `src/lib/providers/types.ts` — Interfaces definidas
- [ ] `src/lib/providers/index.ts` — Factory funcional
- [ ] `src/lib/providers/late-provider.ts` — LateProvider funcional

### BYO Providers
- [ ] `src/lib/providers/byo/base.ts` — Base class com helpers
- [ ] `src/lib/providers/byo/registry.ts` — Registry de plataformas
- [ ] `src/lib/providers/byo/instagram.ts` — Publish imagem + legenda
- [ ] `src/lib/providers/byo/facebook.ts` — Publish texto/imagem em Page
- [ ] `src/lib/providers/byo/youtube.ts` — Upload de vídeo
- [ ] `src/lib/providers/byo/linkedin.ts` — Publish texto/imagem
- [ ] `src/lib/providers/byo/tiktok.ts` — Upload de vídeo
- [ ] `src/lib/providers/byo/pinterest.ts` — Create pin
- [ ] `src/lib/providers/byo/twitter.ts` — Tweet texto/imagem
- [ ] `src/lib/providers/byo/threads.ts` — Publish texto/imagem

### OAuth Flow
- [ ] `POST /api/accounts/connect/[platform]` — Gera auth URL
- [ ] `POST /api/accounts/callback` — Processa callback, cria SocialAccount
- [ ] Callback page adaptada para novo flow
- [ ] Entity selection funciona para Facebook/LinkedIn/Pinterest

### Integration
- [ ] Cron pipeline usa providers reais
- [ ] Token refresh automático antes de publicar
- [ ] Credential management (Late API key via settings)

### Verificação
- [ ] `npm run build` — Zero erros
- [ ] `npm run lint` — Zero novos warnings
- [ ] `npx tsc --noEmit` — Zero erros de tipo
- [ ] LateProvider: publish via Late SDK funciona
- [ ] BYO Instagram: connect + publish imagem
- [ ] BYO Twitter: connect + publish tweet
- [ ] BYO Threads: connect + publish texto
- [ ] Tokens encriptados no DB (não em texto plano)
- [ ] Cron pipeline publica via provider correto
- [ ] Token refresh funciona quando token expira
