# Storage

Robo MultiPost supports 3 storage backends for media uploads:

- `VERCEL_BLOB` (default)
- `S3_COMPAT` (AWS S3, Cloudflare R2, MinIO, etc.)
- `URL_ONLY` (no upload, only public URLs)

Storage selection is controlled by `STORAGE_PROVIDER`.

## Architecture

The media upload flow is:

1. Compose uploader requests a token at `POST /api/media/upload-token`.
2. API validates file type and size, then returns `{ token, pathname, ... }`.
3. Browser uploads directly to Vercel Blob using the token.
4. UI stores `{ url, key, provider, contentType, size }` in compose state.
5. Post creation sends those media items through `/api/posts` or `/api/public/v1/posts`.

Storage implementations:

- `src/lib/storage/vercel-blob.ts`
- `src/lib/storage/s3-storage.ts`
- `src/lib/storage/url-only.ts`

Factory and interfaces:

- `src/lib/storage/types.ts`
- `src/lib/storage/index.ts`

## Environment Variables

### Core

```env
STORAGE_PROVIDER=VERCEL_BLOB
STORAGE_PLAN_NAME=Hobby
STORAGE_QUOTA_GB=1
```

Optional for client-side UI mode detection:

```env
NEXT_PUBLIC_STORAGE_PROVIDER=VERCEL_BLOB
```

### Vercel Blob

```env
STORAGE_PROVIDER=VERCEL_BLOB
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxx
```

### S3 Compatible

```env
STORAGE_PROVIDER=S3_COMPAT
S3_ENDPOINT=https://xxx.r2.cloudflarestorage.com
S3_REGION=auto
S3_ACCESS_KEY_ID=xxxxx
S3_SECRET_ACCESS_KEY=xxxxx
S3_BUCKET=robo-multipost-media
S3_PUBLIC_URL=https://media.example.com
S3_FORCE_PATH_STYLE=false
```

### URL Only

```env
STORAGE_PROVIDER=URL_ONLY
NEXT_PUBLIC_STORAGE_PROVIDER=URL_ONLY
```

In URL-only mode, file uploads are rejected by API and users should attach media by URL in compose.

`STORAGE_PLAN_NAME` and `STORAGE_QUOTA_GB` are optional metadata used by the dashboard/media UI to display plan and remaining space. They apply globally to the current infrastructure (shared across all workspaces).

If `STORAGE_PROVIDER=VERCEL_BLOB` and `STORAGE_QUOTA_GB` is not configured, the app falls back to `1GB` and plan name `Hobby`.

## Limits and Validation

- Accepted image MIME types: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- Accepted video MIME types: `video/mp4`, `video/quicktime`, `video/x-msvideo`, `video/webm`
- Image max size: `10MB`
- Video max size: `500MB`
- Multipart recommendation threshold: `100MB`

For Instagram reels/stories with video, the app enforces:

- MIME type must be `video/mp4`
- URL pathname must end with `.mp4`

## Storage Key Pattern

Uploaded objects use:

```text
{workspaceId}/{folder}/{timestamp}-{uuid}-{filename}
```

`folder` defaults to `posts` in the token-based upload flow.

## Post Deletion Cleanup

`DELETE /api/posts/[postId]` performs best-effort media cleanup:

1. Fetch post media items scoped by `workspaceId`.
2. Delete each storage key using the provider stored on each `MediaItem`.
3. Log cleanup errors without blocking post deletion.
4. Delete post row (DB cascade removes `MediaItem` records).

## Dashboard Storage Usage Indicators

The media page (`/dashboard/media`), media library modal, and settings card consume:

- `GET /api/media/storage`

Response includes:

- `provider`
- `planName`
- `quotaBytes`
- `usedBytes`
- `remainingBytes`
- `usedPercent`
- `usageSource` (`blob_sdk` or `db`)
- `isQuotaFallback`

Usage calculation behavior:

- `VERCEL_BLOB`: tries Blob SDK `list()` scoped by `prefix = {workspaceId}/`.
- On Blob lookup failure: falls back to `MediaAsset.size` sum from database.
- Other providers: uses database sum directly.

## Operational Notes

- Legacy endpoints `POST /api/media/upload` and `POST /api/public/v1/media` are deprecated and return `410 Gone`.
- The recommended public API flow is `POST /api/public/v1/media/token` + direct client upload to Blob.
- Vercel Blob direct uploads bypass Next.js request body size limits and are required for large files.
