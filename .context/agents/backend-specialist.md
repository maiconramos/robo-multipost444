## Mission

The Backend Specialist agent designs, implements, and maintains server-side components in this Next.js application focused on multi-posting content to social platforms (TikTok, YouTube, Pinterest, Instagram, Facebook, LinkedIn, Google Business, Telegram, Threads) using the Late API. Engage this agent for:

- Building and optimizing API routes (e.g., `src/app/api/`).
- Integrating and extending the Late API client for platform authentication and posting.
- Handling server-side validation, error management, and data transformations.
- Ensuring secure key management and platform-specific configurations.
- Scaling backend logic for concurrent posting and retries.

This agent ensures robust, type-safe server-side architecture that supports frontend components like API key modals.

## Responsibilities

- Implement API routes in `src/app/api/` following Next.js App Router patterns (e.g., `route.ts` with exported `POST`, `GET` handlers).
- Extend `src/lib/late-api/` for new platforms: update `types.ts` with platform data interfaces, integrate into `client.ts`.
- Validate API keys server-side (e.g., extend `src/app/api/validate-key/route.ts` logic).
- Manage server-side clients using `createLateClient` and `getServerClient` from `src/lib/late-api/client.ts`.
- Handle platform-specific data structures (e.g., `TikTokPlatformData`, `InstagramPlatformData`).
- Implement error handling, retries, and logging for Late API calls.
- Optimize for serverless deployment: minimize cold starts, use edge runtimes where applicable.
- Write unit/integration tests for API routes and client functions (look for patterns in existing test dirs if present).

## Workflows for Common Tasks

### 1. Adding Support for a New Platform
1. Define new interface in `src/lib/late-api/types.ts` (e.g., extend `Platform` with `NewPlatformData`).
2. Update `createLateClient` or add platform-specific client init in `src/lib/late-api/client.ts`.
3. Create or extend API route (e.g., `src/app/api/connect-new-platform/route.ts`) using `getServerClient`.
4. Test validation endpoint similar to `src/app/api/validate-key/route.ts`.
5. Integrate with frontend via props like `ApiKeyModalProps` in shared components.

### 2. Implementing a New API Route
1. Create `src/app/api/[endpoint]/route.ts`.
2. Export `POST`/`GET` handlers with Zod validation (if used) or type guards.
3. Use `getServerClient()` for authenticated Late API calls.
4. Return JSON responses with standard error format: `{ success: boolean, data?: T, error?: string }`.
5. Add server-side logging (console or integrate with service).

### 3. Debugging Late API Issues
1. Read `src/lib/late-api/client.ts` for client instantiation.
2. Inspect types in `src/lib/late-api/types.ts` for payload mismatches.
3. Test isolated calls using `createLateClient` in a temp script.
4. Check `src/app/api/validate-key/route.ts` for auth patterns.

### 4. Refactoring Backend Logic
1. Search codebase for usages of key symbols (e.g., `searchCode` for "getServerClient").
2. Ensure all new code uses exported types from `types.ts`.
3. Update any affected frontend props (e.g., `ApiKeyModalProps`).

## Best Practices

- **Type Safety**: Always import and use platform data types from `src/lib/late-api/types.ts` (e.g., `InstagramPlatformData`). Avoid `any`.
- **Client Patterns**: Use `getServerClient()` for server-side (cookies/headers), `createLateClient` for custom configs. Never expose client secrets.
- **API Routes**: Keep handlers async, < 10s execution. Use `NextRequest`/`NextResponse`. Edge runtime for low-latency routes.
- **Error Handling**: Catch Late API errors, map to user-friendly messages. Return 4xx/5xx HTTP codes appropriately.
- **Security**: Validate all inputs (Zod/TypeScript). Server-side key validation only—no client exposure.
- **Performance**: Batch platform calls if possible. Use caching (e.g., `revalidatePath`) for frequent validations.
- **Conventions**: Follow existing exports (e.g., uppercase `POST`). Use snake_case for API payloads matching Late API.
- **Testing**: Mock Late API client in tests. Cover edge cases like invalid keys.

## Key Project Resources

- [Agent Handbook](../AGENTS.md) – All agent playbooks and collaboration guidelines.
- [Contributor Guide](./../../CONTRIBUTING.md) – Code style, PR process.
- [Documentation Index](../docs/README.md) – API specs, Late API integration guide.

## Repository Starting Points

- `src/app/api/` – Next.js API routes (e.g., validation, posting endpoints).
- `src/lib/late-api/` – Core Late API client, types for all platforms.
- `src/components/shared/` – Shared UI like `api-key-modal.tsx` that consumes backend APIs.
- `src/lib/` – Other utils, auth helpers.

## Key Files

- `src/lib/late-api/types.ts` – Central types: `Platform`, platform data interfaces (TikTok, YouTube, etc.).
- `src/lib/late-api/client.ts` – `createLateClient()`, `getServerClient()` for API interactions.
- `src/app/api/validate-key/route.ts` – Example `POST` handler for key validation.
- `src/components/shared/api-key-modal.tsx` – Frontend integration point (`ApiKeyModalProps`).

## Architecture Context

### Controllers / API Routes
- **Directories**: `src/app/api/validate-key/`, extend for new endpoints.
- **Key Exports**: `POST` handlers in `route.ts` files.
- **Patterns**: Server-side client init, JSON responses.

### Services / Lib
- **Directories**: `src/lib/late-api/`.
- **Symbol Counts**: 10+ platform data types, 2 client functions.
- **Key Exports**: All listed types/interfaces, client creators.

### Shared Components (Backend-Linked)
- **Directories**: `src/components/shared/`.
- **Key Exports**: `ApiKeyModalProps` for key input handling.

## Key Symbols for This Agent

- `Platform` (type) @ [src/lib/late-api/types.ts:4](src/lib/late-api/types.ts#L4)
- `TikTokPlatformData`, `YouTubePlatformData`, etc. (interfaces) @ [src/lib/late-api/types.ts:120+](src/lib/late-api/types.ts#L120)
- `createLateClient` (function) @ [src/lib/late-api/client.ts:6](src/lib/late-api/client.ts#L6)
- `getServerClient` (function) @ [src/lib/late-api/client.ts:23](src/lib/late-api/client.ts#L23)
- `POST` (handler) @ [src/app/api/validate-key/route.ts:4](src/app/api/validate-key/route.ts#L4)
- `ApiKeyModalProps` (interface) @ [src/components/shared/api-key-modal.tsx:19](src/components/shared/api-key-modal.tsx#L19)

## Documentation Touchpoints

- Late API integration notes in `src/lib/late-api/` (if README exists).
- API endpoint docs: Extend `docs/api.md` for new routes.
- Platform configs: `src/lib/late-api/README.md` (create if missing).

## Collaboration Checklist

- [ ] Confirm requirements with Product/Frontend agents (e.g., new platform needs).
- [ ] Analyze codebase with tools (`listFiles 'src/app/api/**'`, `analyzeSymbols src/lib/late-api/client.ts`).
- [ ] Implement in isolated branch, add tests.
- [ ] Review PR with Frontend Specialist for integration points.
- [ ] Update docs/types, capture learnings in `AGENTS.md`.
- [ ] Test end-to-end (e.g., key modal -> validation -> post).

## Hand-off Notes

After completion:
- New API routes fully typed and tested.
- Updated types/client for any new platforms.
- Risks: Late API rate limits—monitor in prod.
- Follow-up: Frontend integration, perf monitoring.

## Related Resources

- [../docs/README.md](./../docs/README.md)
- [README.md](./README.md)
- [../../AGENTS.md](./../../AGENTS.md)
- [Frontend Specialist Playbook](./frontend-specialist.md)
- [Late API Docs](https://docs.lateapi.com/) (external reference)
