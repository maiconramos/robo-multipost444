# AI Integration Guide

## Overview

Robo MultiPost integrates AI through a workspace-scoped OpenRouter provider. Each workspace can store its own encrypted API key and default models in the `Credential` table (`type = "ai_api_key"`).

The integration currently supports:

- Caption/text generation from the composer
- Text improvement presets (improve, shorten, hashtags, translate)
- Image generation (with style + aspect ratio)
- AI status detection per workspace

## Architecture

### Server-side modules

- `src/lib/ai/types.ts`: shared AI interfaces and model constants
- `src/lib/ai/openrouter.ts`: OpenRouter provider implementation
- `src/lib/ai/index.ts`: factory + availability checks

### API routes

- `POST /api/ai/generate-text`
- `POST /api/ai/generate-image`
- `GET /api/ai/status`

All routes require an authenticated user and workspace membership (`getWorkspaceUser`).

### Client integration

- `src/hooks/use-ai.ts`: React Query hooks for text/image generation and status
- `src/app/dashboard/compose/_components/ai-assistant.tsx`: text assistant UI
- `src/app/dashboard/compose/_components/ai-image-generator.tsx`: image generator modal
- `src/app/dashboard/compose/page.tsx`: compose integration
- `src/app/dashboard/settings/page.tsx`: AI credential/model configuration

## Credential Storage

AI credentials are stored in `Credential` with:

- `type`: `ai_api_key`
- `keyEnc`: encrypted API key (AES-256-GCM)
- `metadata`: non-sensitive config

Example metadata:

```json
{
  "provider": "openrouter",
  "textModel": "openai/gpt-4o-mini",
  "imageModel": "google/gemini-2.5-flash-image-preview"
}
```

## Environment Flags

`AI_PROVIDER` controls whether AI is globally enabled:

- `OPENROUTER` (default): AI enabled
- `NONE`: AI disabled

The OpenRouter API key is not read from env vars in runtime flow; it is read from encrypted workspace credentials.

## OpenRouter Request Details

### Text generation

Endpoint:

- `POST https://openrouter.ai/api/v1/chat/completions`

Headers:

- `Authorization: Bearer <workspace_key>`
- `Content-Type: application/json`
- `X-Title: Robo MultiPost`
- `HTTP-Referer: <app_url>` (when available)

### Image generation

Endpoint:

- `POST https://openrouter.ai/api/v1/chat/completions`

Request uses `modalities: ["image", "text"]` and optional `image_config.aspect_ratio`.

## Error Handling

The provider maps common OpenRouter failures to actionable messages:

- `401`: invalid API key
- `402`: no credits available
- `403`: request not authorized
- `404`: configured model not found
- `429`: rate limit reached
- timeout (60s): gateway timeout

## Security Notes

- API keys are encrypted at rest with `ENCRYPTION_KEY`
- Workspace scoping is required for every credential lookup
- No API key is exposed to client-side code
- UI only reads status/metadata, never decrypted secrets

## Extending with New Providers

1. Implement `AIProvider` methods (`generateText`, `generateImage`, `isAvailable`).
2. Add provider selection logic in `src/lib/ai/index.ts` based on env + credential metadata.
3. Keep `/api/ai/*` routes provider-agnostic.
4. Add model options to settings UI and docs.
