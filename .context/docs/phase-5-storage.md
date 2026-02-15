# Fase 5: Media Storage

> **Status:** Plano detalhado. SEM implementação.
> **Pré-requisito:** Fase 3 (Core Scheduler) concluída. Fase 4 (Providers) recomendada mas não obrigatória.
> **Objetivo:** Implementar o sistema de storage de mídia com 3 backends — Vercel Blob (default), S3-compatible, e URL-only — para suportar upload de imagens e vídeos no compose.

---

## 1. Estado Atual (o que existe hoje)

### 1.1. Schema Prisma (pronto)

```prisma
model MediaItem {
  id          String  @id @default(cuid())
  postId      String
  type        String  // "image" | "video"
  url         String
  key         String? // storage key for deletion
  provider    String? // "VERCEL_BLOB" | "S3_COMPAT" | "URL_ONLY" | "late"
  filename    String?
  contentType String?
  width       Int?
  height      Int?
  size        Int?
  duration    Int?    // video duration in seconds

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  @@map("media_item")
}
```

### 1.2. Hook de Media (Fase 3 — migrado)

```typescript
// src/hooks/use-media.ts (após migração da Fase 3)
// Chama fetch('/api/media/upload') com FormData
export function useUploadMedia() { ... }
export function useUploadMultipleMedia() { ... }

// Utilitários (mantidos):
export function getMediaType(mimeType: string): "image" | "video" { ... }
export function isValidMediaType(file: File): boolean { ... }
export function getMaxFileSize(type: "image" | "video"): number { ... }
```

### 1.3. API Route de Upload (Fase 3 — placeholder)

O `src/app/api/media/upload/route.ts` existe como placeholder desde a Fase 3, aceitando arquivos mas sem storage real.

### 1.4. Compose Page — Media Uploader (UI pronta)

- `src/app/dashboard/compose/_components/media-uploader.tsx` — Componente completo com drag-and-drop, preview, e validação de tipo/tamanho

### 1.5. Credential Model (pronto)

```prisma
model Credential {
  id          String @id @default(cuid())
  workspaceId String
  type        String // "late_api_key", "storage_config", etc.
  keyEnc      String // AES-256-GCM encrypted value
  metadata    Json?
  @@unique([workspaceId, type])
}
```

Pode armazenar credenciais S3 como `type: "s3_config"`.

---

## 2. Arquitetura Alvo

### 2.1. MediaStorage Interface

```typescript
// src/lib/storage/types.ts

export interface UploadOptions {
  filename: string;
  contentType: string;
  workspaceId: string;
  folder?: string;     // e.g., "posts", "avatars"
}

export interface StoredMedia {
  url: string;          // Public URL for accessing the media
  key: string;          // Storage key for deletion
  provider: string;     // "VERCEL_BLOB" | "S3_COMPAT" | "URL_ONLY"
  size: number;
  contentType: string;
}

export interface MediaStorage {
  /**
   * Upload a file to storage.
   */
  upload(file: Buffer, options: UploadOptions): Promise<StoredMedia>;

  /**
   * Delete a file from storage.
   */
  delete(key: string): Promise<void>;

  /**
   * Get a public URL for a stored file.
   * For most providers, url === key. For S3, may need presign.
   */
  getUrl(key: string): Promise<string>;
}
```

### 2.2. Storage Factory

```typescript
// src/lib/storage/index.ts

export function getStorage(): MediaStorage {
  const provider = process.env.STORAGE_PROVIDER || "VERCEL_BLOB";

  switch (provider) {
    case "VERCEL_BLOB":
      return new VercelBlobStorage();
    case "S3_COMPAT":
      return new S3Storage();
    case "URL_ONLY":
      return new UrlOnlyStorage();
    default:
      throw new Error(`Unknown storage provider: ${provider}`);
  }
}
```

### 2.3. Fluxo de Upload

```
User seleciona arquivo no Media Uploader (compose page)
  → useUploadMedia() hook
  → POST /api/media/upload (FormData com arquivo)
  → API Route:
    1. getWorkspaceUser(headers) — auth
    2. Extrair arquivo do FormData
    3. Validar tipo e tamanho
    4. getStorage() → MediaStorage implementation
    5. storage.upload(buffer, options)
    6. Retornar { url, key, provider, size, contentType }
  → Hook atualiza UI com preview
  → User cria post → MediaItem salvo no DB com url, key, provider
```

### 2.4. Fluxo de Deleção

```
User deleta post (ou remove mídia do post)
  → DELETE /api/posts/:id (cascade deleta MediaItems)
  → Ou: API hook para cleanup
  → Para cada MediaItem:
    → getStorage()
    → storage.delete(key)
    → Remove row do DB
```

---

## 3. Arquivos a Criar (6 novos)

### 3.1. Storage Core

| Arquivo | Propósito | Detalhes |
|---------|-----------|----------|
| `src/lib/storage/types.ts` | Interfaces | MediaStorage, UploadOptions, StoredMedia |
| `src/lib/storage/index.ts` | Factory | `getStorage()` — retorna implementation baseada em STORAGE_PROVIDER env |

### 3.2. Implementations

| Arquivo | Propósito | Detalhes |
|---------|-----------|----------|
| `src/lib/storage/vercel-blob.ts` | Vercel Blob | Usa `@vercel/blob` SDK. Upload via `put()`. Delete via `del()`. URL pública automática |
| `src/lib/storage/s3-storage.ts` | S3 Compatible | Usa `@aws-sdk/client-s3`. Suporta AWS S3, Cloudflare R2, MinIO, etc. Upload via `PutObjectCommand`. URL via `GetObjectCommand` ou endpoint público |
| `src/lib/storage/url-only.ts` | URL Only | Sem upload — user fornece URL diretamente. `upload()` retorna a URL como está. `delete()` é no-op. Útil para quem hospeda mídia externamente |

### 3.3. Documentação

| Arquivo | Propósito |
|---------|-----------|
| `.context/docs/storage.md` | Como o storage funciona, como configurar cada provider, limites |

---

## 4. Arquivos a Modificar (3 existentes)

### 4.1. `src/app/api/media/upload/route.ts`

**Antes (Fase 3):** Placeholder — aceita arquivo mas retorna URL fake ou temporária.
**Depois:** Implementação real com storage provider.

**Mudanças concretas:**
```typescript
import { getStorage } from "@/lib/storage";

export async function POST(request: NextRequest) {
  const { workspace } = await getWorkspaceUser(request.headers);
  const formData = await request.formData();
  const file = formData.get("file") as File;

  // Validar tipo e tamanho
  if (!isValidMediaType(file)) { return 400; }
  if (file.size > getMaxFileSize(getMediaType(file.type))) { return 400; }

  // Upload
  const storage = getStorage();
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await storage.upload(buffer, {
    filename: file.name,
    contentType: file.type,
    workspaceId: workspace.id,
    folder: "posts",
  });

  return NextResponse.json({
    url: result.url,
    key: result.key,
    provider: result.provider,
    type: getMediaType(file.type),
    filename: file.name,
    contentType: file.type,
    size: result.size,
  });
}
```

### 4.2. `src/hooks/use-media.ts`

**Mudanças:**
- Remover `useMediaPresign` (presign flow não é mais necessário)
- `useUploadMedia`: enviar FormData para `/api/media/upload`, receber `StoredMedia`
- Adaptar tipo de retorno `UploadedMedia` para incluir `key` e `provider`

### 4.3. `src/app/api/posts/[postId]/route.ts`

**Mudanças no DELETE:**
- Antes de deletar post, buscar MediaItems
- Para cada MediaItem: `getStorage().delete(key)`
- Depois deletar post (cascade deleta MediaItems do DB)

**Nota:** O delete do storage é "best effort" — se falhar, não impede a deleção do post.

---

## 5. Detalhes por Provider

### 5.1. Vercel Blob (Default)

**Dependência:** `@vercel/blob`

```typescript
// src/lib/storage/vercel-blob.ts
import { put, del } from "@vercel/blob";

export class VercelBlobStorage implements MediaStorage {
  async upload(file: Buffer, options: UploadOptions): Promise<StoredMedia> {
    const pathname = `${options.workspaceId}/${options.folder || "media"}/${Date.now()}-${options.filename}`;
    const blob = await put(pathname, file, {
      access: "public",
      contentType: options.contentType,
    });

    return {
      url: blob.url,
      key: blob.url, // Vercel Blob usa URL como key
      provider: "VERCEL_BLOB",
      size: file.length,
      contentType: options.contentType,
    };
  }

  async delete(key: string): Promise<void> {
    await del(key);
  }

  async getUrl(key: string): Promise<string> {
    return key; // URL pública é o próprio key
  }
}
```

**Env vars:**
```env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
```

**Limites:**
- Arquivo: até 500MB (Vercel Pro), 4.5MB (Vercel Hobby)
- Sem custo extra para bandwidth em projetos Vercel

### 5.2. S3 Compatible (AWS S3, Cloudflare R2, MinIO)

**Dependência:** `@aws-sdk/client-s3`

```typescript
// src/lib/storage/s3-storage.ts
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

export class S3Storage implements MediaStorage {
  private client: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor() {
    this.client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
    });
    this.bucket = process.env.S3_BUCKET!;
    this.publicUrl = process.env.S3_PUBLIC_URL || `https://${this.bucket}.s3.amazonaws.com`;
  }

  async upload(file: Buffer, options: UploadOptions): Promise<StoredMedia> {
    const key = `${options.workspaceId}/${options.folder || "media"}/${Date.now()}-${options.filename}`;

    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file,
      ContentType: options.contentType,
      ACL: "public-read",
    }));

    return {
      url: `${this.publicUrl}/${key}`,
      key,
      provider: "S3_COMPAT",
      size: file.length,
      contentType: options.contentType,
    };
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));
  }

  async getUrl(key: string): Promise<string> {
    return `${this.publicUrl}/${key}`;
  }
}
```

**Env vars:**
```env
S3_ENDPOINT=https://xxx.r2.cloudflarestorage.com  # Para R2
S3_REGION=auto
S3_ACCESS_KEY_ID=xxxxx
S3_SECRET_ACCESS_KEY=xxxxx
S3_BUCKET=robo-multipost-media
S3_PUBLIC_URL=https://media.example.com           # Custom domain opcional
```

### 5.3. URL Only (sem upload)

```typescript
// src/lib/storage/url-only.ts
export class UrlOnlyStorage implements MediaStorage {
  async upload(file: Buffer, options: UploadOptions): Promise<StoredMedia> {
    // URL Only não faz upload — rejeita tentativas
    throw new Error(
      "URL-only storage does not support file uploads. " +
      "Use the media URL directly when creating posts."
    );
  }

  async delete(key: string): Promise<void> {
    // No-op — não gerenciamos o storage
  }

  async getUrl(key: string): Promise<string> {
    return key; // Key é a própria URL
  }
}
```

**Nota:** No modo URL-only, o compose page mostra um campo de URL em vez de upload. O `useUploadMedia` hook detecta o provider e ajusta o comportamento.

---

## 6. Sub-tarefas Detalhadas

### 6a. Instalar Dependências

```bash
npm install @vercel/blob
npm install @aws-sdk/client-s3   # Opcional — só se S3_COMPAT será testado
```

### 6b. Criar Interfaces e Factory

1. Criar `src/lib/storage/types.ts` com interfaces
2. Criar `src/lib/storage/index.ts` com factory
3. Testar: factory retorna provider correto baseado em env var

### 6c. Implementar Vercel Blob

1. Criar `src/lib/storage/vercel-blob.ts`
2. Testar upload/delete com `BLOB_READ_WRITE_TOKEN` real

### 6d. Implementar S3 Compatible

1. Criar `src/lib/storage/s3-storage.ts`
2. Testar com Cloudflare R2 ou MinIO local

### 6e. Implementar URL Only

1. Criar `src/lib/storage/url-only.ts`
2. Adaptar media uploader UI para modo URL-only

### 6f. Atualizar API Route de Upload

1. Substituir placeholder por implementação real
2. Integrar validação de tipo/tamanho
3. Retornar StoredMedia completo

### 6g. Atualizar Hook de Media

1. Adaptar `useUploadMedia` para novo formato de resposta
2. Adicionar suporte para URL-only mode
3. Remover `useMediaPresign` (não mais necessário)

### 6h. Cleanup em Deleção de Posts

1. Atualizar `DELETE /api/posts/:id` para deletar mídia do storage
2. Best-effort: log erro se deleção do storage falhar, mas não bloquear

---

## 7. Ordem de Implementação

```
5.1 — Interfaces e factory (types.ts, index.ts)
5.2 — Vercel Blob implementation
5.3 — Atualizar /api/media/upload com storage real
5.4 — Atualizar use-media.ts hook
5.5 — Testar upload end-to-end (compose → upload → post)
5.6 — S3 Compatible implementation
5.7 — URL Only implementation
5.8 — Cleanup de mídia na deleção de posts
5.9 — Documentação (.context/docs/storage.md)
5.10 — Verificar build, lint, types
```

---

## 8. Variáveis de Ambiente

### Core

```env
STORAGE_PROVIDER=VERCEL_BLOB    # VERCEL_BLOB | S3_COMPAT | URL_ONLY
```

### Vercel Blob

```env
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
```

### S3 Compatible

```env
S3_ENDPOINT=https://xxx.r2.cloudflarestorage.com
S3_REGION=auto
S3_ACCESS_KEY_ID=xxxxx
S3_SECRET_ACCESS_KEY=xxxxx
S3_BUCKET=robo-multipost-media
S3_PUBLIC_URL=https://media.example.com    # Opcional: custom domain
```

---

## 9. Decisões de Design

### D1: Upload direto ou presigned URL?

**Recomendação:** Upload direto via API route (client → server → storage).
**Alternativa:** Presigned URL (client → storage direto) para melhor performance.
**Motivo:** Upload direto é mais simples, permite validação server-side, e funciona com todos os providers. Presigned URL pode ser adicionado como otimização futura.

### D2: Limites de tamanho?

**Recomendação:**
- Imagens: 10MB max
- Vídeos: 500MB max (limitado pelo provider e plano Vercel)
**Motivo:** Alinhado com limites das plataformas sociais. Vercel Hobby tem 4.5MB body limit — para vídeos grandes, presigned URL seria necessário.

### D3: Organização de keys no storage?

**Recomendação:** `{workspaceId}/{folder}/{timestamp}-{filename}`
**Motivo:** Isolamento por workspace. Timestamp evita conflitos. Folder permite separação lógica.

### D4: E o body size limit do Next.js/Vercel?

**Recomendação:** Para Vercel Hobby (4.5MB body limit), vídeos grandes precisarão de presigned URL ou chunked upload. Documentar esta limitação. Para self-hosted, configurar `api.bodyParser.sizeLimit` no Next.js config.
**Motivo:** Limitação do Vercel, não do app.

### D5: Quando deletar mídia do storage?

**Recomendação:** Na deleção do post. Best-effort — se falhar, apenas log.
**Alternativa:** Background job de cleanup (mais robusto mas mais complexo).
**Motivo:** Simples para MVP. Background cleanup pode ser adicionado depois.

---

## 10. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Body size limit do Vercel (4.5MB Hobby) | ALTO para vídeos | Documentar. Recomendar Pro ou self-hosted para vídeos. Futuro: presigned URL |
| S3 credentials expostas se ENCRYPTION_KEY vazado | ALTO | S3 creds em env vars (não no DB). Rotação de keys |
| Upload lento para vídeos grandes | MÉDIO | Progresso de upload na UI. Timeout generoso. Futuro: chunked upload |
| Vercel Blob indisponível | BAIXO | Retry na UI. Error handling com mensagem clara |
| Custos de storage (S3/Blob) inesperados | MÉDIO | Documentar custos por provider. Limites de upload por workspace (futuro) |
| URL-only user tenta upload | BAIXO | Error claro no upload. UI mostra campo de URL em vez de drop zone |

---

## 11. Checklist Final — Fase 5

### Infraestrutura
- [ ] `npm install @vercel/blob` — Dependência instalada
- [ ] `src/lib/storage/types.ts` — Interfaces definidas
- [ ] `src/lib/storage/index.ts` — Factory funcional

### Implementations
- [ ] `src/lib/storage/vercel-blob.ts` — Upload, delete, getUrl funcionais
- [ ] `src/lib/storage/s3-storage.ts` — Upload, delete, getUrl funcionais
- [ ] `src/lib/storage/url-only.ts` — Rejeita upload, getUrl retorna key

### Integration
- [ ] `POST /api/media/upload` — Upload real com storage provider
- [ ] `use-media.ts` — Hook atualizado para novo formato
- [ ] `DELETE /api/posts/:id` — Deleta mídia do storage
- [ ] Compose page: upload funciona end-to-end

### Verificação
- [ ] `npm run build` — Zero erros
- [ ] `npm run lint` — Zero novos warnings
- [ ] `npx tsc --noEmit` — Zero erros de tipo
- [ ] `STORAGE_PROVIDER=VERCEL_BLOB`: upload imagem → URL funcional
- [ ] `STORAGE_PROVIDER=S3_COMPAT`: upload → arquivo no bucket
- [ ] `STORAGE_PROVIDER=URL_ONLY`: upload rejeitado, URL manual funciona
- [ ] Deleção de post: MediaItems removidos do storage
- [ ] Validação: arquivo tipo inválido → erro 400
- [ ] Validação: arquivo muito grande → erro 400

### Documentação
- [ ] `.context/docs/storage.md` — Guia de configuração para cada provider
