# Fase 2: Neon Auth + Workspaces

> **Status:** Plano detalhado. SEM implementação.
> **Pré-requisito:** Fase 1 (Foundation) concluída.
> **Objetivo:** Substituir auth por API key (localStorage) por Neon Auth (Better Auth) com multi-tenancy baseada em workspaces.

---

## 1. Estado Atual (o que existe hoje)

### 1.1. Fluxo de Autenticação Atual

```
Landing (page.tsx)
  → Botão "Get Started" abre <ApiKeyModal>
  → Usuário digita Late API key
  → POST /api/validate-key (server-side: new Late({ apiKey }) → late.usage.getUsageStats())
  → Se válida: useAuthStore.setApiKey(key) → Zustand persist → localStorage["latewiz-auth"]
  → Redirect → /dashboard
```

**Problemas:**
- API key em texto plano no `localStorage`, acessível via DevTools
- Zero conceito de sessão, user identity, ou multi-tenancy
- Sem middleware — proteção de rotas é 100% client-side
- Sem logout server-side — apenas limpa localStorage

### 1.2. Arquivos que Controlam Auth Hoje

| Arquivo | Responsabilidade | O que muda |
|---------|------------------|------------|
| `src/stores/auth-store.ts` | Zustand persist: `{ apiKey, usageStats }` em `localStorage["latewiz-auth"]` | Remover `apiKey` e `usageStats` do persist. Session-based via Neon Auth |
| `src/components/shared/api-key-modal.tsx` | Modal para inserir Late API key | **DELETAR** (substituída por login Neon Auth) |
| `src/components/providers.tsx` | `HydrationGate` espera `hasHydrated` do `useAuthStore` para renderizar | Trocar gate para session do Better Auth |
| `src/app/page.tsx` (Landing) | Redireciona para `/dashboard` se `apiKey` existe; botão "Get Started" abre `ApiKeyModal` | Redirecionar para login Neon Auth em vez de abrir modal |
| `src/app/dashboard/layout.tsx` | Lê `apiKey` do Zustand. Redireciona para `/` se null. Exibe `usageStats` no sidebar | Auth check via session. Remover exibição de `usageStats` da Late |
| `src/app/dashboard/settings/page.tsx` | Exibe/esconde Late API key. Mostra usage stats. Botão "Sign Out" limpa Zustand | Remover seção de API key. Sign Out chama endpoint de logout |
| `src/app/api/validate-key/route.ts` | Único API route existente. Valida Late API key server-side | Pode ser mantido para validação durante setup do provider Late |

### 1.3. O que o `auth-store.ts` Persiste Hoje

```typescript
// src/stores/auth-store.ts (62 linhas)
interface AuthState {
  apiKey: string | null;           // ← REMOVER (vai para Credential no DB)
  usageStats: UsageStats | null;   // ← REMOVER (busca sob demanda via API)
  isValidating: boolean;
  error: string | null;
  hasHydrated: boolean;
  // ... setters e logout()
}

// Persiste em localStorage["latewiz-auth"]:
partialize: (state) => ({
  apiKey: state.apiKey,      // ← PROBLEMA: API key em texto plano
  usageStats: state.usageStats,
})
```

### 1.4. Como o Dashboard Layout Protege Rotas

```typescript
// src/app/dashboard/layout.tsx (334 linhas)
export default function DashboardLayout({ children }) {
  const { apiKey, usageStats, logout, hasHydrated } = useAuthStore();

  // Redirect se não autenticado (client-side only)
  useEffect(() => {
    if (hasHydrated && !apiKey) {
      router.push("/");
    }
  }, [apiKey, hasHydrated, router]);

  // Não renderiza até hidratar
  if (!hasHydrated || !apiKey) return null;

  // ... sidebar, header, profile selector, usage stats
}
```

**Problemas:**
- Proteção é 100% client-side — server renderiza HTML sem auth check
- Flash de conteúdo possível antes da hidratação do Zustand
- Sem conceito de user — avatar usa hash da API key

### 1.5. Como o `providers.tsx` Funciona

```typescript
// src/components/providers.tsx (51 linhas)
function HydrationGate({ children }) {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const [mounted, setMounted] = useState(false);

  // Espera mount + hydration do Zustand
  if (!mounted || !hasHydrated) return null;

  return <>{children}</>;
}

export function Providers({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <HydrationGate>{children}</HydrationGate>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
```

---

## 2. Onde Estamos com o Schema (Fase 1 concluída)

As tabelas de autenticação e workspace já existem em `prisma/schema.prisma`:

### Tabelas Better Auth (já no schema)
- `user` — id, name, email, emailVerified, image
- `session` — id, expiresAt, token, userId, ipAddress, userAgent
- `account` — id, accountId, providerId, userId, accessToken, etc.
- `verification` — id, identifier, value, expiresAt

### Tabelas de Workspace (já no schema)
- `Workspace` — id, name, slug (unique)
- `WorkspaceMember` — workspaceId, userId, role (OWNER/ADMIN/MEMBER), unique([workspaceId, userId])
- `Invite` — workspaceId, email, token (unique), expiresAt, acceptedAt
- `Credential` — workspaceId, type, keyEnc (AES-256-GCM), unique([workspaceId, type])

### Dependências já instaladas (Fase 1)
- `@prisma/client` ✅
- `prisma` (dev) ✅

### Dependência FALTANTE
- `better-auth` — **precisa ser instalada nesta fase**

---

## 3. Arquitetura Alvo (como ficará após Fase 2)

### 3.1. Novo Fluxo de Autenticação

```
Landing (page.tsx)
  → Botão "Get Started" → /login (ou /api/auth/sign-in)
  → Neon Auth (Better Auth): email/password ou OAuth (Google, GitHub)
  → Session cookie set (httpOnly, secure, sameSite)
  → Redirect → /dashboard

/dashboard/* (middleware.ts intercepta)
  → Lê session cookie
  → Válida? → Permite acesso
  → Inválida? → Redirect → /login

Dashboard (layout.tsx)
  → Server component ou hook lê session
  → Busca workspace do user (WorkspaceMember)
  → Sem workspace? → Redirect → /setup (primeiro user) ou /no-access (sem invite)
  → Com workspace? → Renderiza dashboard com workspace context
```

### 3.2. Fluxo de Primeiro Acesso (Workspace Auto-Create)

```
Novo usuário faz signup via Neon Auth
  → user row criada pelo Better Auth
  → Redirect para /dashboard
  → middleware.ts permite (session válida)
  → Dashboard verifica workspace:
    → SELECT WorkspaceMember WHERE userId = ?
    → Se ZERO rows:
      → Auto-cria Workspace "Default" + WorkspaceMember(role: OWNER)
      → Redirect para /setup (wizard de configuração)
    → Se existe:
      → Renderiza dashboard normalmente
```

### 3.3. Fluxo de Convite

```
OWNER/ADMIN no workspace:
  → POST /api/workspaces/invite { email, workspaceId }
  → Cria row Invite com token único + expiresAt (7 dias)
  → (Futuro: envia email com link)
  → Link: /invite/[token]

Convidado:
  → Acessa link → /invite/[token]
  → Se não logado → redirect para login com returnUrl=/invite/[token]
  → Se logado → POST /api/workspaces/invite/accept { token }
  → Cria WorkspaceMember(role: MEMBER)
  → Redirect → /dashboard
```

---

## 4. Arquivos a Criar (13 novos)

### 4.1. Auth Core

| Arquivo | Propósito | Detalhes |
|---------|-----------|----------|
| `src/lib/auth/index.ts` | Config do Better Auth | Inicializa `betterAuth({ database: prismaAdapter, ... })`. Define providers: email/password + social (Google, GitHub). Configura session, cookies, callbacks |
| `src/lib/auth/client.ts` | Client-side auth helpers | `createAuthClient()` para uso em componentes client. Exporta hooks: `useSession`, `signIn`, `signUp`, `signOut` |
| `src/lib/auth/get-current-user.ts` | Helper server-side | `getCurrentUser(headers)` → lê session cookie → retorna `{ user, session }` ou null. Usado em API routes e server components |
| `src/lib/auth/workspace.ts` | Lógica de workspace | `ensureMembership(userId)` — verifica se user tem workspace; auto-cria se primeiro acesso. `getWorkspaceForUser(userId)` — retorna workspace ativo. `requireWorkspace(userId)` — throw se sem acesso |

### 4.2. Routes

| Arquivo | Propósito | Detalhes |
|---------|-----------|----------|
| `src/app/api/auth/[...all]/route.ts` | Better Auth catch-all handler | Roteia todas as chamadas de auth (login, signup, callback, logout, session). `export { GET, POST }` from better-auth handler |
| `src/app/api/workspaces/route.ts` | Workspace CRUD | `GET` — lista workspaces do user. `POST` — cria workspace (se `ENABLE_MULTI_WORKSPACE=true` e user é OWNER) |
| `src/app/api/workspaces/invite/route.ts` | Sistema de convites | `POST` — cria invite (OWNER/ADMIN only). `PUT` — aceita invite (com token). `DELETE` — revoga invite |

### 4.3. Pages

| Arquivo | Propósito | Detalhes |
|---------|-----------|----------|
| `src/app/login/page.tsx` | Tela de login | Form com email/password + botões de social login (Google, GitHub). Usa auth client do Better Auth. Redirect para /dashboard após login |
| `src/app/signup/page.tsx` | Tela de cadastro | Form com name, email, password. Ou pode ser mesma page que login com tabs. Após signup → auto-login → redirect |
| `src/app/no-access/page.tsx` | Tela "sem acesso" | Exibe mensagem amigável: "Você não é membro de nenhum workspace. Peça um convite ao administrador." Botão de logout |
| `src/app/invite/[token]/page.tsx` | Aceitação de convite | Lê token da URL. Se logado, aceita invite e redireciona. Se não logado, redireciona para login com returnUrl |

### 4.4. Middleware

| Arquivo | Propósito | Detalhes |
|---------|-----------|----------|
| `src/middleware.ts` | Proteção de rotas no edge | Intercepta `/dashboard/*`, `/api/posts/*`, `/api/accounts/*`, etc. Valida session cookie via Better Auth. Redirect para `/login` se inválido. Passa por rotas públicas: `/`, `/login`, `/signup`, `/api/auth/*`, `/invite/*` |

### 4.5. Documentação

| Arquivo | Propósito |
|---------|-----------|
| `.context/docs/auth.md` | Documentação de como o Neon Auth funciona no projeto, fluxos, config |
| `.context/docs/workspaces.md` | Documentação de workspaces, roles, convites, auto-criação |

---

## 5. Arquivos a Modificar (7 existentes)

### 5.1. `src/components/providers.tsx`

**Antes:** `HydrationGate` espera `hasHydrated` do `useAuthStore` (Zustand).
**Depois:** Remover dependência de `useAuthStore.hasHydrated`. O gate de auth passa a ser o `middleware.ts` (server-side). O `HydrationGate` pode ser simplificado ou removido — basta aguardar mount para evitar SSR mismatch de theme.

```
ANTES:
  HydrationGate → useAuthStore.hasHydrated → renderiza children

DEPOIS:
  Providers → QueryClientProvider → ThemeProvider → children
  (auth gate é feito por middleware.ts, não por providers.tsx)
```

### 5.2. `src/app/layout.tsx`

**Antes:** Apenas wraps com `Providers` (React Query + Theme).
**Depois:** Pode precisar adicionar `SessionProvider` do Better Auth se o client-side auth precisa de context. Verificar se Better Auth requer provider wrapper ou se funciona via cookies apenas.

**Mudança provável:**
- Metadados: atualizar title de "LateWiz" para "Robo MultiPost"
- Adicionar auth session provider (se necessário pelo Better Auth client)

### 5.3. `src/app/page.tsx` (Landing)

**Antes:** Botão "Get Started" abre `<ApiKeyModal>`. Redireciona para `/dashboard` se `apiKey` existe.
**Depois:** Botão "Get Started" linka para `/login` (ou `/signup`). Redireciona para `/dashboard` se session existe (via server-side redirect ou client check).

**Mudanças concretas:**
- Remover import e uso de `ApiKeyModal`
- Remover import de `useAuthStore`
- Botão "Get Started" → `<Link href="/login">` ou `<Link href="/signup">`
- Redirect para dashboard se já logado: verificar session (server-side ou via auth client hook)
- Atualizar textos/branding de "LateWiz" para "Robo MultiPost"

### 5.4. `src/app/dashboard/layout.tsx`

**Antes:** Lê `apiKey` do Zustand. Redireciona se null. Exibe `usageStats` no sidebar. Avatar usa hash da API key.
**Depois:** Session check já feito por `middleware.ts`. Layout pode confiar que user está autenticado. Buscar user info e workspace do session/DB.

**Mudanças concretas:**
- Remover: `const { apiKey, usageStats, logout, hasHydrated } = useAuthStore()`
- Adicionar: buscar user info do session (via auth client hook ou server component)
- Remover: seção de `usageStats` no sidebar (Late-specific, vai para settings)
- Remover: `if (!hasHydrated || !apiKey) return null` (middleware garante auth)
- Avatar: usar `user.image` ou `user.name` em vez de hash da API key
- Logout: chamar `signOut()` do auth client em vez de `useAuthStore.logout()`
- Profile selector: manter, mas futuramente será workspace-scoped

### 5.5. `src/app/dashboard/settings/page.tsx`

**Antes:** Exibe API key (show/hide), usage stats, theme, timezone, session (logout).
**Depois:** Remover seção de API key. Remover usage stats. Adicionar: info do user (nome, email), workspace info, provider config (Late API key via Credential — será Phase 3+).

**Mudanças concretas:**
- Remover: card "API Key" inteiro (linhas 66-146)
- Remover: imports de `useAuthStore` para `apiKey` e `usageStats`
- Manter: cards de Appearance (theme), Timezone, Session (logout)
- Adicionar: card "Account" com nome/email do user (read-only nesta fase)
- Adicionar: card "Workspace" com nome do workspace (read-only nesta fase)
- Logout: chamar `signOut()` do auth client

### 5.6. `src/stores/auth-store.ts`

**Antes:** Persiste `{ apiKey, usageStats }` em localStorage.
**Depois (Fase 2):** Manter o store mas remover `apiKey` e `usageStats` do persist. Session é gerenciada por cookies do Better Auth, não por Zustand.

**Opção A — Manter store esvaziado:**
```typescript
// Apenas tracking de estado de UI (hasHydrated para theme flash prevention)
interface AuthState {
  hasHydrated: boolean;
  setHasHydrated: (hydrated: boolean) => void;
}
```

**Opção B — Deletar store e usar apenas auth client:**
```typescript
// Usar useSession() do Better Auth client em vez de Zustand
// hasHydrated resolvido por providers.tsx mounted state
```

**Recomendação:** Opção B é mais limpa. Deletar `auth-store.ts` e migrar `hasHydrated` para lógica de mount em `providers.tsx`.

### 5.7. `package.json`

**Adicionar:**
```json
{
  "dependencies": {
    "better-auth": "^1.x.x"
  }
}
```

---

## 6. Arquivos a Deletar (1)

| Arquivo | Motivo | Fase |
|---------|--------|------|
| `src/components/shared/api-key-modal.tsx` | API key não é mais inserida pelo usuário. Login via Neon Auth | 2 |

**Nota:** `src/hooks/use-late.ts` será deletado na Fase 5 (Hook Migration), não nesta fase.

---

## 7. Sub-tarefas Detalhadas

### 7a. Instalar Better Auth + Config Inicial

1. `npm install better-auth`
2. Criar `src/lib/auth/index.ts` com config do Better Auth:
   - Database adapter: Prisma (conecta ao Neon via `prisma` singleton)
   - Session strategy: cookies (httpOnly, secure in prod)
   - Providers: email/password (mínimo). Google e GitHub como opcional.
   - Callbacks: `onUserCreated` → auto-criar workspace "Default"
3. Criar `src/lib/auth/client.ts`:
   - `createAuthClient()` com base URL do app
   - Exportar hooks: `useSession`, `signIn`, `signUp`, `signOut`
4. Criar `src/app/api/auth/[...all]/route.ts`:
   - Import handler do Better Auth
   - Export `{ GET, POST }`
5. Gerar `BETTER_AUTH_SECRET` e `BETTER_AUTH_URL` no `.env.local`
6. Rodar migration: `npx prisma migrate dev --name add-auth-tables` (se schema mudou) ou `npx prisma db push`

**Verificação:**
```bash
npm run build                    # Sem erros
curl http://localhost:3000/api/auth/get-session  # Retorna null (sem session)
```

### 7b. Middleware de Proteção de Rotas

1. Criar `src/middleware.ts`:
   - Matcher: `/dashboard/:path*`, `/api/posts/:path*`, `/api/accounts/:path*`, `/api/queues/:path*`, `/api/profiles/:path*`, `/api/media/:path*`, `/api/workspaces/:path*`
   - Rotas públicas (bypass): `/`, `/login`, `/signup`, `/api/auth/:path*`, `/api/validate-key`, `/api/cron/:path*`, `/invite/:path*`
   - Lógica: ler session cookie → validar via Better Auth → redirect para `/login` se inválido
   - Para API routes protegidas: retornar 401 em vez de redirect

**Verificação:**
```bash
# Acessar /dashboard sem login → redirect para /login
# Acessar /api/posts sem session → 401
# Acessar / → funciona normalmente
# Acessar /api/auth/sign-in → funciona (rota pública)
```

### 7c. Pages de Login/Signup

1. Criar `src/app/login/page.tsx`:
   - Form com email + password
   - Botão "Sign in with Google" (se configurado)
   - Botão "Sign in with GitHub" (se configurado)
   - Link "Don't have an account? Sign up"
   - Usar `signIn.email()` do auth client
   - Redirect para `/dashboard` após sucesso
   - Exibir errors inline

2. Criar `src/app/signup/page.tsx`:
   - Form com name, email, password
   - Ou: tab na mesma page de login
   - Usar `signUp.email()` do auth client
   - Redirect para `/dashboard` após sucesso (auto-login)
   - Link "Already have an account? Sign in"

3. Criar `src/app/no-access/page.tsx`:
   - Mensagem: "Você não tem acesso a nenhum workspace."
   - Instrução: "Peça um convite ao administrador."
   - Botão: "Sign Out" → `signOut()` → redirect para `/`
   - Estilo: centralizado, clean, usa componentes existentes

**Verificação:**
```bash
# Signup com email/password → user criado → redirect para /dashboard
# Login com credentials → session criada → redirect para /dashboard
# Logout → session destruída → redirect para /
```

### 7d. Lógica de Workspace

1. Criar `src/lib/auth/workspace.ts`:

```
ensureWorkspace(userId: string):
  1. SELECT WorkspaceMember WHERE userId
  2. Se ZERO → cria Workspace "Default" + WorkspaceMember(role: OWNER)
  3. Retorna workspaceId

getWorkspaceForUser(userId: string):
  1. SELECT WorkspaceMember WHERE userId (com JOIN Workspace)
  2. Se ENABLE_MULTI_WORKSPACE=false → retorna primeiro
  3. Se multiple → retorna o que está no cookie/header de workspace ativo
  4. Se ZERO → throw "NO_WORKSPACE"

requireWorkspace(userId: string):
  1. Chama getWorkspaceForUser
  2. Se erro → redirect para /no-access
  3. Retorna { workspace, member }
```

2. Criar `src/lib/auth/get-current-user.ts`:

```
getCurrentUser(headers: Headers):
  1. Extrai session cookie dos headers
  2. Valida via Better Auth
  3. Retorna { user, session } ou null

getAuthenticatedUser(headers: Headers):
  1. Chama getCurrentUser
  2. Se null → throw "UNAUTHORIZED"
  3. Retorna { user, session }

getWorkspaceUser(headers: Headers):
  1. Chama getAuthenticatedUser → { user, session }
  2. Chama requireWorkspace(user.id) → { workspace, member }
  3. Retorna { user, session, workspace, member }
```

**Verificação:**
```bash
# Primeiro signup → workspace "Default" criado automaticamente
# Segundo user sem invite → /no-access
# OWNER convida email → invite criado
# Convidado aceita → WorkspaceMember criado
```

### 7e. API de Workspaces e Convites

1. `src/app/api/workspaces/route.ts`:
   - `GET`: lista workspaces do user autenticado
   - `POST`: cria novo workspace (se `ENABLE_MULTI_WORKSPACE=true` e user é OWNER de algum workspace)
   - Validação: session obrigatória

2. `src/app/api/workspaces/invite/route.ts`:
   - `POST { workspaceId, email }`: cria invite (OWNER/ADMIN only)
     - Gera token único (`crypto.randomUUID()`)
     - Expira em 7 dias
     - (Futuro: enviar email)
   - `PUT { token }`: aceita invite
     - Valida token não expirado e não aceito
     - Cria WorkspaceMember(role: MEMBER)
     - Marca invite.acceptedAt
   - `DELETE { inviteId }`: revoga invite (OWNER/ADMIN only)

3. `src/app/invite/[token]/page.tsx`:
   - Lê token da URL
   - Se não logado → redirect para `/login?returnUrl=/invite/{token}`
   - Se logado → chama `PUT /api/workspaces/invite` com token
   - Sucesso → redirect para `/dashboard`
   - Erro → mensagem: "Convite inválido ou expirado"

### 7f. Atualizar Componentes Existentes

1. **`providers.tsx`** — Simplificar `HydrationGate`:
   - Remover dependência de `useAuthStore.hasHydrated`
   - Manter apenas `mounted` check para evitar SSR mismatch de theme
   - Se Better Auth precisa de provider wrapper, adicionar aqui

2. **`page.tsx` (Landing)** — Trocar auth:
   - Remover `<ApiKeyModal>` e seu import
   - Remover `useAuthStore` import
   - "Get Started" → `<Link href="/login">`
   - Verificar session para redirect (via auth client hook ou server-side)

3. **`dashboard/layout.tsx`** — Nova auth:
   - Remover `useAuthStore` completamente
   - Auth check feito por middleware (já garantido)
   - User info: via `useSession()` hook do auth client
   - Avatar: `user.image || getAvatarUrl(user.name)`
   - Logout: `signOut()` do auth client
   - Remover seção de `usageStats` do sidebar

4. **`dashboard/settings/page.tsx`** — Limpar API key:
   - Remover card "API Key" inteiro
   - Remover referências a `usageStats`
   - Manter cards: Appearance, Timezone, Session
   - Adicionar card "Account" (nome, email) read-only
   - Logout: `signOut()` em vez de `useAuthStore.logout()`

5. **`auth-store.ts`** — Esvaziar ou deletar:
   - Remover `apiKey`, `usageStats`, e seus setters
   - Se `hasHydrated` não for mais necessário: deletar arquivo inteiro
   - Se ainda necessário para mount gate: manter mínimo

6. **`api-key-modal.tsx`** — Deletar:
   - Não é mais utilizado em nenhum lugar

### 7g. Documentação

1. **`.context/docs/auth.md`**:
   - Como Neon Auth (Better Auth) funciona no projeto
   - Fluxo de login/signup/logout
   - Session cookies e middleware
   - Como adicionar novos OAuth providers
   - Referências a `src/lib/auth/`

2. **`.context/docs/workspaces.md`**:
   - Modelo de multi-tenancy
   - Roles: OWNER, ADMIN, MEMBER e permissões
   - Auto-criação de workspace para primeiro user
   - Fluxo de convites
   - `ENABLE_MULTI_WORKSPACE` flag
   - Como queries são scoped por workspaceId

---

## 8. Order de Implementação (sub-steps dentro da Fase 2)

```
2.1 — Install better-auth + criar config (auth/index.ts, auth/client.ts)
2.2 — Criar API route handler (api/auth/[...all]/route.ts)
2.3 — Criar middleware.ts (proteção de rotas)
2.4 — Criar pages: login, signup, no-access
2.5 — Criar workspace logic (auth/workspace.ts, auth/get-current-user.ts)
2.6 — Criar workspace API (api/workspaces/route.ts, invite)
2.7 — Criar invite page (invite/[token]/page.tsx)
2.8 — Atualizar providers.tsx (remover HydrationGate baseado em apiKey)
2.9 — Atualizar landing page (remover ApiKeyModal, usar link para /login)
2.10 — Atualizar dashboard/layout.tsx (session-based, remover usageStats)
2.11 — Atualizar settings page (remover API key card)
2.12 — Limpar auth-store.ts (remover apiKey, usageStats)
2.13 — Deletar api-key-modal.tsx
2.14 — Criar docs (auth.md, workspaces.md)
2.15 — Verificar build, lint, types
```

**Ponto de atenção:** Passos 2.1-2.7 podem ser feitos SEM quebrar o app atual (auth paralela). Passos 2.8-2.13 são a "troca de chave" — quando o app passa de API key para session. Esses devem ser feitos juntos num único commit para evitar estado quebrado.

---

## 9. Variáveis de Ambiente Necessárias

### Novas (obrigatórias para Fase 2)

```env
# Better Auth
BETTER_AUTH_SECRET=<random-32+chars>    # Gerar: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
BETTER_AUTH_URL=http://localhost:3000    # URL base do app

# Já existem da Fase 1 (manter):
DATABASE_URL=postgresql://...
ENCRYPTION_KEY=<64-char-hex>
```

### Opcionais (OAuth social)

```env
# Google OAuth (se quiser social login)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# GitHub OAuth (se quiser social login)
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

### Feature Flags

```env
ENABLE_MULTI_WORKSPACE=false    # Já definido no docker-compose.yml
```

---

## 10. Decisões de Design

### D1: Login com email/password ou apenas OAuth?

**Recomendação:** Email/password como padrão. OAuth (Google, GitHub) como opcional configurável.
**Motivo:** Self-hosted users não terão OAuth configurado; email/password é o mínimo viável.

### D2: Mesma page para login e signup, ou separadas?

**Recomendação:** Páginas separadas (`/login` e `/signup`).
**Motivo:** URLs claras, SEO, deep-linking. Simples de implementar com Better Auth.

### D3: Onde fica o workspace context no client?

**Recomendação:** Cookie `workspace-id` (httpOnly) setado no login/switch. Hooks leem via API response headers ou context.
**Alternativa:** Zustand store (mas perde em server components). URL param `?ws=xxx` (verbose).
**Motivo:** Cookie é acessível em middleware e server components sem JS.

### D4: O que acontece com o `app-store.ts` (timezone, defaultProfileId)?

**Recomendação:** Manter como está nesta fase. `defaultProfileId` será workspace-scoped na Fase 5 quando hooks migrarem. Timezone permanece em localStorage.

### D5: Deletar auth-store.ts ou esvaziar?

**Recomendação:** Deletar completamente. O `mounted` check de `providers.tsx` substitui `hasHydrated`. Outros stores não dependem dele.

---

## 11. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Better Auth + Prisma adapter incompatibilidade | ALTO | Testar adapter antes de implementar tudo. Verificar versões compatíveis |
| Session cookie não propagando em API routes | MÉDIO | Testar cookie flow end-to-end em dev antes de continuar |
| Middleware bloqueando rotas que deveria permitir | ALTO | Manter lista explícita de rotas públicas. Testar cada rota |
| Workspace auto-create race condition (2 requests simultâneos) | BAIXO | Usar `@@unique([workspaceId, userId])` + try/catch no insert |
| Flash de conteúdo não-autenticado | MÉDIO | Middleware garante redirect server-side. Client components podem verificar via `useSession()` |
| Breaking change nos hooks existentes | ALTO | Não tocar nos hooks nesta fase. Hooks continuam usando Late SDK via `useAuthStore.apiKey` até Fase 5 |

---

## 12. Coexistência Fase 2 (Auth Paralela)

**Problema:** Durante a implementação, o app precisa continuar funcionando. Os hooks atuais dependem de `useAuthStore.apiKey` para instanciar o Late SDK.

**Estratégia:** Implementar auth nova SEM remover a antiga. Passos 2.1-2.7 adicionam a infraestrutura de auth sem quebrar nada. Passos 2.8-2.13 fazem a troca.

**Durante a transição:**
1. Login via Neon Auth funciona → session cookie set
2. Setup wizard (ou settings) pede Late API key → salva como `Credential` encriptada no DB
3. `useAuthStore.apiKey` é populado A PARTIR do DB (via API route) em vez de ser digitado no modal
4. Hooks continuam funcionando porque `apiKey` ainda existe no store (vindo do DB em vez do modal)

**Esta transição suave é o que permite que Fase 2 (auth) e Fase 5 (hook migration) sejam fases separadas.**

---

## 13. Checklist Final — Fase 2

### Infraestrutura
- [ ] `npm install better-auth`
- [ ] `src/lib/auth/index.ts` — Better Auth config com Prisma adapter
- [ ] `src/lib/auth/client.ts` — Client-side auth helpers e hooks
- [ ] `src/lib/auth/get-current-user.ts` — Server-side session → user helper
- [ ] `src/lib/auth/workspace.ts` — ensureWorkspace, getWorkspaceForUser, requireWorkspace
- [ ] `src/app/api/auth/[...all]/route.ts` — Better Auth route handler
- [ ] `src/middleware.ts` — Protege `/dashboard/*` e API routes

### Pages
- [ ] `src/app/login/page.tsx` — Login form (email/password + social)
- [ ] `src/app/signup/page.tsx` — Signup form
- [ ] `src/app/no-access/page.tsx` — "Sem acesso a workspace"
- [ ] `src/app/invite/[token]/page.tsx` — Aceitação de convite

### API Routes
- [ ] `src/app/api/workspaces/route.ts` — GET list + POST create
- [ ] `src/app/api/workspaces/invite/route.ts` — POST create + PUT accept + DELETE revoke

### Atualizações
- [ ] `src/components/providers.tsx` — Remover dependência de apiKey/hasHydrated do auth-store
- [ ] `src/app/page.tsx` — "Get Started" → `/login` em vez de ApiKeyModal
- [ ] `src/app/layout.tsx` — Adicionar session provider se necessário
- [ ] `src/app/dashboard/layout.tsx` — Session-based auth, remover usageStats
- [ ] `src/app/dashboard/settings/page.tsx` — Remover card de API key
- [ ] `package.json` — Adicionar `better-auth` dep

### Limpeza
- [ ] Deletar `src/components/shared/api-key-modal.tsx`
- [ ] Deletar ou esvaziar `src/stores/auth-store.ts`

### Documentação
- [ ] `.context/docs/auth.md`
- [ ] `.context/docs/workspaces.md`

### Verificação
- [ ] `npx prisma generate` — Schema compila
- [ ] `npx prisma db push` — Tabelas criadas/atualizadas no DB
- [ ] `npm run build` — Zero erros
- [ ] `npm run lint` — Zero novos warnings
- [ ] `npx tsc --noEmit` — Zero erros de tipo
- [ ] Signup cria user + workspace "Default" automaticamente
- [ ] Login seta session cookie → acesso ao dashboard
- [ ] Logout destrói session → redirect para /
- [ ] User sem workspace → /no-access
- [ ] Middleware bloqueia /dashboard sem session → redirect para /login
- [ ] Middleware permite rotas públicas (/, /login, /api/auth/*)
- [ ] API routes retornam 401 sem session
- [ ] `localStorage` NÃO contém `apiKey` ou `latewiz-auth`
- [ ] Convite: OWNER cria → convidado aceita → acesso ao workspace
