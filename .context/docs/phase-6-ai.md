# Fase 6: AI Integration (Texto + Imagem)

> **Status:** Plano detalhado. SEM implementação.
> **Pré-requisito:** Fase 3 (Core Scheduler) concluída. Fases 4 e 5 recomendadas.
> **Objetivo:** Integrar IA no composer para gerar legendas, variações de texto, e imagens — acelerando a produção de conteúdo para redes sociais.

---

## 1. Estado Atual (o que existe hoje)

### 1.1. Compose Page (UI pronta)

- `src/app/dashboard/compose/page.tsx` (236 linhas) — Editor de posts completo
- `src/app/dashboard/compose/_components/media-uploader.tsx` — Upload de mídia
- `src/app/dashboard/compose/_components/platform-selector.tsx` — Seleção de plataformas
- `src/app/dashboard/compose/_components/schedule-picker.tsx` — Agendamento

**Faltam:** Componentes de IA no composer (botão "Generate", painel de sugestões, geração de imagem).

### 1.2. Credential Model (pronto)

```prisma
model Credential {
  id          String @id @default(cuid())
  workspaceId String
  type        String // Pode usar "ai_api_key", "openrouter_key"
  keyEnc      String // AES-256-GCM encrypted
  metadata    Json?  // { provider: "openrouter", model: "..." }
  @@unique([workspaceId, type])
}
```

### 1.3. Nenhuma implementação de IA

- ZERO endpoints /api/ai/*
- ZERO hooks de IA
- ZERO componentes de IA

---

## 2. Arquitetura Alvo

### 2.1. Providers de IA

```
AIProvider (interface)
  ├── OpenRouterProvider (texto + imagem)
  │   ├── Modelo texto: gpt-4o-mini, claude-3-haiku, etc. (via OpenRouter)
  │   └── Modelo imagem: dall-e-3, stable-diffusion, etc. (via OpenRouter)
  └── (Futuro) KIENanoBananaProvider (imagem alternativa)
```

### 2.2. Fluxo de Geração de Texto

```
User no Composer:
  → Clica "Generate Caption" ou "Improve Text"
  → Abre painel de IA com opções:
    - "Generate caption for [platform]"
    - "Make it shorter"
    - "Make it more engaging"
    - "Translate to [language]"
    - "Generate hashtags"
    - Custom prompt
  → Frontend: POST /api/ai/generate-text { prompt, context, platform }
  → API Route:
    1. getWorkspaceUser(headers) — auth
    2. Buscar Credential type="ai_api_key" do workspace
    3. Decriptar API key
    4. Chamar OpenRouter API com prompt
    5. Retornar texto gerado
  → UI: Exibir sugestão → User aceita/edita → Insere no editor
```

### 2.3. Fluxo de Geração de Imagem

```
User no Composer:
  → Clica "Generate Image"
  → Abre modal com:
    - Campo de prompt (descrição da imagem)
    - Seleção de estilo (realistic, cartoon, minimalist, etc.)
    - Seleção de aspect ratio (1:1, 4:5, 16:9, 9:16)
  → Frontend: POST /api/ai/generate-image { prompt, style, aspectRatio }
  → API Route:
    1. Auth + workspace check
    2. Buscar AI API key do Credential
    3. Chamar OpenRouter API (ou provider de imagem)
    4. Receber URL da imagem gerada
    5. (Opcional) Salvar imagem no storage (Fase 5)
    6. Retornar { imageUrl, revisedPrompt }
  → UI: Preview da imagem → User aceita → Adiciona como MediaItem
```

### 2.4. AI Provider Interface

```typescript
// src/lib/ai/types.ts

export interface GenerateTextOptions {
  prompt: string;
  context?: string;       // Conteúdo existente do post
  platform?: string;      // instagram, twitter, etc.
  maxTokens?: number;
  temperature?: number;
}

export interface GenerateTextResult {
  text: string;
  model: string;
  tokensUsed: number;
}

export interface GenerateImageOptions {
  prompt: string;
  style?: "realistic" | "cartoon" | "minimalist" | "artistic" | "photographic";
  aspectRatio?: "1:1" | "4:5" | "16:9" | "9:16";
  size?: string;          // e.g., "1024x1024"
}

export interface GenerateImageResult {
  imageUrl: string;
  revisedPrompt?: string;
  model: string;
}

export interface AIProvider {
  generateText(options: GenerateTextOptions): Promise<GenerateTextResult>;
  generateImage(options: GenerateImageOptions): Promise<GenerateImageResult>;
  isAvailable(): boolean;
}
```

---

## 3. Arquivos a Criar (9 novos)

### 3.1. AI Core

| Arquivo | Propósito | Detalhes |
|---------|-----------|----------|
| `src/lib/ai/types.ts` | Interfaces | AIProvider, GenerateTextOptions, GenerateTextResult, GenerateImageOptions, GenerateImageResult |
| `src/lib/ai/index.ts` | Factory | `getAIProvider(workspaceId)` — busca Credential, retorna provider configurado. Retorna `null` se sem API key |
| `src/lib/ai/openrouter.ts` | OpenRouter impl | Chama OpenRouter API para texto e imagem. Suporta múltiplos modelos. Headers: `Authorization: Bearer ${key}`, `X-Title: Robo MultiPost` |

### 3.2. API Routes

| Arquivo | Propósito | Detalhes |
|---------|-----------|----------|
| `src/app/api/ai/generate-text/route.ts` | Geração de texto | `POST { prompt, context?, platform?, maxTokens? }` → Chama AI provider → Retorna `{ text, model, tokensUsed }` |
| `src/app/api/ai/generate-image/route.ts` | Geração de imagem | `POST { prompt, style?, aspectRatio? }` → Chama AI provider → Retorna `{ imageUrl, revisedPrompt, model }` |

### 3.3. Hook

| Arquivo | Propósito | Detalhes |
|---------|-----------|----------|
| `src/hooks/use-ai.ts` | React Query hooks | `useGenerateText(options)` — mutation que chama `/api/ai/generate-text`. `useGenerateImage(options)` — mutation que chama `/api/ai/generate-image`. `useAIAvailable()` — query que verifica se IA está configurada |

### 3.4. Components

| Arquivo | Propósito | Detalhes |
|---------|-----------|----------|
| `src/app/dashboard/compose/_components/ai-assistant.tsx` | Painel de IA no composer | Botão "AI" que abre painel lateral. Opções de geração de texto (presets). Campo de prompt custom. Preview de sugestão. Botão aceitar/rejeitar |
| `src/app/dashboard/compose/_components/ai-image-generator.tsx` | Modal de geração de imagem | Campo de prompt. Seleção de estilo e aspect ratio. Preview da imagem gerada. Botão "Use this image" → adiciona ao post |

### 3.5. Documentação

| Arquivo | Propósito |
|---------|-----------|
| `.context/docs/ai.md` | Como a IA funciona, configuração do OpenRouter, como adicionar novos providers |

---

## 4. Arquivos a Modificar (2 existentes)

### 4.1. `src/app/dashboard/compose/page.tsx`

**Mudanças:**
- Adicionar botão "AI Assistant" no toolbar do editor
- Importar `AIAssistant` e `AIImageGenerator` components
- Integrar: quando user aceita sugestão de texto, inserir no campo de content
- Integrar: quando user aceita imagem gerada, adicionar ao array de mediaItems

### 4.2. `src/app/dashboard/settings/page.tsx`

**Mudanças:**
- Adicionar card "AI Configuration":
  - Input para API key do OpenRouter (masked)
  - Seleção de modelo padrão para texto
  - Seleção de modelo padrão para imagem
  - Botão "Test Connection" — chama API para validar key
- Salvar via `POST /api/credentials { type: "ai_api_key", value: apiKey }`

---

## 5. Detalhes do OpenRouter

### 5.1. Endpoint

```
Base URL: https://openrouter.ai/api/v1
```

### 5.2. Geração de Texto

```typescript
// POST https://openrouter.ai/api/v1/chat/completions
{
  "model": "openai/gpt-4o-mini",  // ou anthropic/claude-3-haiku
  "messages": [
    {
      "role": "system",
      "content": "You are a social media content expert. Generate engaging captions for {platform}."
    },
    {
      "role": "user",
      "content": "{prompt}\n\nContext: {existing content}"
    }
  ],
  "max_tokens": 500,
  "temperature": 0.7
}

Headers:
  Authorization: Bearer {OPENROUTER_API_KEY}
  X-Title: Robo MultiPost
  Content-Type: application/json
```

### 5.3. Geração de Imagem

```typescript
// POST https://openrouter.ai/api/v1/images/generations
// Ou via chat completions com modelo de imagem:
{
  "model": "openai/dall-e-3",
  "messages": [
    {
      "role": "user",
      "content": "Generate an image: {prompt}. Style: {style}."
    }
  ]
}

// Alternativa: direct image generation
// POST https://openrouter.ai/api/v1/images/generations
{
  "model": "openai/dall-e-3",
  "prompt": "{prompt}",
  "size": "1024x1024",
  "quality": "standard",
  "n": 1
}
```

### 5.4. Modelos Recomendados

**Texto:**
| Modelo | Custo | Qualidade | Uso |
|--------|-------|-----------|-----|
| `openai/gpt-4o-mini` | Baixo | Bom | Default para geração rápida |
| `anthropic/claude-3-haiku` | Baixo | Bom | Alternativa rápida |
| `openai/gpt-4o` | Médio | Excelente | Para conteúdo mais elaborado |
| `anthropic/claude-3.5-sonnet` | Médio | Excelente | Alternativa premium |

**Imagem:**
| Modelo | Custo | Qualidade | Uso |
|--------|-------|-----------|-----|
| `openai/dall-e-3` | Médio | Excelente | Default para imagens |
| `stabilityai/stable-diffusion-xl` | Baixo | Bom | Alternativa econômica |

### 5.5. System Prompts Predefinidos

```typescript
const AI_PRESETS = {
  generateCaption: (platform: string) =>
    `Generate an engaging social media caption for ${platform}. Be concise, use relevant emojis, and include a call-to-action.`,

  improveText: () =>
    `Improve the following social media caption. Make it more engaging while keeping the same meaning.`,

  makeShorter: () =>
    `Shorten this caption while keeping the main message. Target 1-2 sentences max.`,

  generateHashtags: (platform: string) =>
    `Generate 5-10 relevant hashtags for the following ${platform} post. Return only the hashtags.`,

  translateTo: (language: string) =>
    `Translate the following social media caption to ${language}. Adapt cultural references if needed.`,

  generateVariations: (count: number) =>
    `Generate ${count} different variations of this caption. Each should have a different tone (casual, professional, humorous).`,
};
```

---

## 6. Sub-tarefas Detalhadas

### 6a. Instalar Dependências

Nenhuma dependência externa necessária — OpenRouter usa REST API padrão via `fetch`.

### 6b. Criar AI Provider

1. Criar `src/lib/ai/types.ts` com interfaces
2. Criar `src/lib/ai/openrouter.ts`:
   - Constructor recebe API key
   - `generateText()`: POST para OpenRouter chat completions
   - `generateImage()`: POST para OpenRouter image generations
   - Error handling: rate limit, invalid key, model not available
3. Criar `src/lib/ai/index.ts`:
   - `getAIProvider(workspaceId)`: busca Credential type="ai_api_key", decripta, retorna OpenRouterProvider
   - Retorna `null` se sem key configurada

### 6c. Criar API Routes

1. `src/app/api/ai/generate-text/route.ts`:
   - Validar body com Zod: `{ prompt, context?, platform?, maxTokens? }`
   - `getAIProvider(workspaceId)` — se null, retorna 400 "AI not configured"
   - Chamar `provider.generateText(options)`
   - Retornar `{ text, model, tokensUsed }`

2. `src/app/api/ai/generate-image/route.ts`:
   - Validar body: `{ prompt, style?, aspectRatio? }`
   - Chamar `provider.generateImage(options)`
   - Retornar `{ imageUrl, revisedPrompt, model }`

### 6d. Criar Hook

1. `src/hooks/use-ai.ts`:
   ```typescript
   export function useGenerateText() {
     return useMutation({
       mutationFn: async (options: GenerateTextOptions) => {
         const res = await fetch('/api/ai/generate-text', {
           method: 'POST',
           body: JSON.stringify(options),
         });
         if (!res.ok) throw new Error('Failed to generate text');
         return res.json();
       },
     });
   }

   export function useGenerateImage() {
     return useMutation({
       mutationFn: async (options: GenerateImageOptions) => {
         const res = await fetch('/api/ai/generate-image', {
           method: 'POST',
           body: JSON.stringify(options),
         });
         if (!res.ok) throw new Error('Failed to generate image');
         return res.json();
       },
     });
   }

   export function useAIAvailable() {
     return useQuery({
       queryKey: ['ai', 'available'],
       queryFn: async () => {
         const res = await fetch('/api/ai/status');
         return res.json(); // { available: boolean, provider: string }
       },
     });
   }
   ```

### 6e. Criar Componentes de IA

1. `ai-assistant.tsx`:
   - Sidebar/popover que aparece no composer
   - Lista de presets (Generate Caption, Improve, Shorten, Hashtags, Translate)
   - Campo de prompt custom
   - Loading state com skeleton
   - Resultado: preview do texto gerado
   - Botões: "Use This" (insere no editor), "Regenerate", "Close"

2. `ai-image-generator.tsx`:
   - Modal dialog
   - Campo de prompt para descrição da imagem
   - Dropdown de estilo
   - Selector de aspect ratio (ícones visuais)
   - Loading state com spinner
   - Preview da imagem gerada
   - Botões: "Use Image" (adiciona ao post), "Regenerate", "Cancel"

### 6f. Integrar no Compose Page

1. Adicionar botão "AI" no toolbar
2. Conectar AI Assistant ao campo de content
3. Conectar AI Image Generator ao array de mediaItems
4. Exibir badge "AI available" se configurado

### 6g. Configuração no Settings

1. Adicionar card "AI Configuration" no settings:
   - Input mascarado para OpenRouter API key
   - Botão "Save" → `POST /api/credentials { type: "ai_api_key", value }`
   - Botão "Test" → `POST /api/ai/generate-text { prompt: "Test" }` — verifica se funciona
   - Seleção de modelo padrão (opcional)
2. Criar `POST /api/credentials` se ainda não existe (pode existir da Fase 4)

---

## 7. Ordem de Implementação

```
6.1 — AI types (interfaces)
6.2 — OpenRouter provider implementation
6.3 — AI factory (getAIProvider)
6.4 — API route: /api/ai/generate-text
6.5 — API route: /api/ai/generate-image
6.6 — Hook: use-ai.ts
6.7 — Componente: ai-assistant.tsx
6.8 — Componente: ai-image-generator.tsx
6.9 — Integrar no compose page
6.10 — Settings: AI configuration card
6.11 — Documentação (.context/docs/ai.md)
6.12 — Verificar build, lint, types
```

---

## 8. Variáveis de Ambiente

```env
# Feature flag — ativa/desativa IA globalmente
AI_PROVIDER=OPENROUTER    # OPENROUTER | NONE

# Nota: A API key do OpenRouter fica armazenada no DB (Credential)
# encriptada, NÃO em env var. A env var apenas controla qual provider usar.
```

---

## 9. Decisões de Design

### D1: API key em env var ou Credential?

**Recomendação:** Credential no DB (encriptado), por workspace. Env var `AI_PROVIDER` apenas controla qual provider está habilitado.
**Motivo:** Multi-tenancy — cada workspace pode ter sua própria chave. Segurança — chaves no DB são encriptadas.

### D2: Streaming de resposta?

**Recomendação:** Não no MVP. Resposta completa.
**Alternativa:** Server-Sent Events (SSE) para streaming word-by-word.
**Motivo:** Simplifica implementação. Streaming pode ser adicionado como melhoria.

### D3: Salvar imagem gerada no storage?

**Recomendação:** Sim — após user aceitar, salvar via `POST /api/media/upload` e usar URL do storage.
**Motivo:** URLs do OpenRouter/DALL-E expiram. Precisa de storage permanente.

### D4: Limitar uso de IA?

**Recomendação:** Sem limite no MVP. Futuro: tracking de tokens por workspace.
**Motivo:** O custo é do próprio user (sua API key). Tracking pode ser adicionado depois.

### D5: KIE Nano Banana — quando adicionar?

**Recomendação:** Não nesta fase. Adicionar como provider alternativo quando disponível.
**Motivo:** OpenRouter já cobre texto + imagem. KIE é opcional.

---

## 10. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| OpenRouter API fora do ar | MÉDIO | Error handling com mensagem clara. Retry button na UI |
| API key inválida ou sem créditos | MÉDIO | Botão "Test Connection" no settings. Mensagem de erro descritiva |
| Geração de conteúdo impróprio | BAIXO | Responsabilidade do user (sua key). Disclaimer na UI |
| Custo inesperado do OpenRouter | BAIXO | Documentar custos por modelo. User gerencia seus créditos |
| URL de imagem gerada expira | ALTO | Salvar imagem no storage (Fase 5) imediatamente após geração |
| Resposta lenta do modelo | MÉDIO | Loading state na UI. Timeout de 60s. Sugerir modelos mais rápidos |

---

## 11. Checklist Final — Fase 6

### AI Core
- [ ] `src/lib/ai/types.ts` — Interfaces definidas
- [ ] `src/lib/ai/openrouter.ts` — Provider funcional
- [ ] `src/lib/ai/index.ts` — Factory com credential lookup

### API Routes
- [ ] `POST /api/ai/generate-text` — Gera texto via OpenRouter
- [ ] `POST /api/ai/generate-image` — Gera imagem via OpenRouter

### Hook
- [ ] `src/hooks/use-ai.ts` — useGenerateText, useGenerateImage, useAIAvailable

### Components
- [ ] `ai-assistant.tsx` — Painel de sugestões de texto
- [ ] `ai-image-generator.tsx` — Modal de geração de imagem

### Integration
- [ ] Compose page: botão AI funcional
- [ ] AI Assistant: gera texto e insere no editor
- [ ] AI Image Generator: gera imagem e adiciona ao post
- [ ] Settings: card de AI configuration funcional
- [ ] Credential salva encriptada no DB

### Verificação
- [ ] `npm run build` — Zero erros
- [ ] `npm run lint` — Zero novos warnings
- [ ] `npx tsc --noEmit` — Zero erros de tipo
- [ ] Sem AI key: botão AI desabilitado ou mostra mensagem
- [ ] Com AI key: gerar texto → resultado aparece
- [ ] Com AI key: gerar imagem → preview aparece
- [ ] Aceitar texto gerado → insere no campo de content
- [ ] Aceitar imagem gerada → aparece no media uploader
- [ ] API key encriptada no DB (verificar Credential table)
- [ ] Nenhuma API key de IA no localStorage ou client bundle
