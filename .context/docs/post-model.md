# Post Model (multi-account platforms[] + legacy socialAccountId)

## Core Model

`Post` now supports multiple destination accounts in a single record via `platformPosts`.

- `post.platformPosts[]` is the source of truth for where/how the post is published.
- `post.socialAccountId` remains as a legacy primary reference and is always populated with the **first selected account**.
- `post.providerType` remains legacy metadata derived from the first selected account.

## Create Flow

1. Client sends `platforms[]` (required) with one entry per selected account:
   - `accountId`
   - `platform`
   - `customContent` (optional)
   - `platformSpecificData` (optional)
2. API validates:
   - unique account IDs
   - accounts belong to workspace
   - all accounts are connected
   - all accounts belong to the same profile
   - platform-specific settings (Instagram/YouTube) and media compatibility
3. API creates:
   - one `Post`
   - N `PlatformPost` rows (one per `platforms[]` item)
   - `socialAccountId = platforms[0].accountId` (legacy primary)

## Update Flow

When `platforms[]` is present in update payload:

- it **replaces all** existing `platformPosts` for that post
- `socialAccountId` (legacy primary) is updated to the first item in `platforms[]`
- profile boundary and platform settings are revalidated

When `platforms[]` is omitted:

- existing `platformPosts` remain unchanged

## Scheduler Behavior 

Cron processing publishes **all** `platformPosts` of a post:

- provider is resolved by each `platformPost.account.connectionMethod`
- status is tracked per platform item (`pending/publishing/published/failed`)
- final post status is consolidated:
  - `published` if all succeed
  - `failed` if at least one fails

### Publish Now behavior

`publishNow` now uses a two-step strategy:

1. create post + cron job (`scheduledAt = now`)
2. trigger immediate processing attempt in the same request

If the immediate processing cannot run, the cron job remains pending as fallback.

## Retry Behavior

Retry resets the full post execution state:

- `post.status -> scheduled`
- all `platformPosts` -> `pending`
- clears `platformPostId`, `platformPostUrl`, `errorMessage`, `publishedAt`
- requeues cron execution
- triggers immediate processing attempt after reset (with cron fallback)

## Operational Logs

Publishing diagnostics are available in:

- UI: `/dashboard/logs`
- API: `GET /api/logs/publishing`

Logs include `post`, `cronJob`, and every `platformPost` status/error/url.

## Delete & Storage Cleanup

Post deletion now performs best-effort cleanup for:

- main media (`mediaItems`)
- platform thumbnails stored in `platformPosts.platformData`:
  - Instagram `reelFeedThumbnail`
  - YouTube `thumbnail`

Legacy `URL_ONLY` and `late` references are not deleted from storage.
