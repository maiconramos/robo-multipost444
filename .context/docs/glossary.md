## Glossary & Domain Concepts

The Robo-Multipost project is a web application for scheduling and managing social media posts across multiple platforms. Key terminology includes:

- **Account**: A connected social media profile (e.g., Instagram, Facebook) used for posting.
- **Post**: A content item (text, media, links) scheduled or published to one or more platforms.
- **Queue**: A recurring schedule for automated posting, defined by slots (time intervals).
- **Profile**: A user-defined workspace grouping accounts, queues, and posts.
- **Platform**: Supported social networks like TikTok, Instagram, Facebook, LinkedIn, etc., each with specific data requirements.
- **Media**: Images, videos, or files uploaded for posts, validated by type and size.
- **Late API**: The backend service handling authentication, account connections, posting, and queue management.

Domain entities revolve around content scheduling workflows, account health monitoring, and multi-platform posting. User personas include social media managers seeking efficient cross-posting and individual creators automating content calendars.

## Type Definitions

- [`Account`](../src/hooks/use-accounts.ts#L13): Represents a connected social media account with platform details, health status, and connection metadata.
- [`AccountHealth`](../src/hooks/use-accounts.ts#L25): Status object for account connectivity and posting eligibility.
- [`CreatePostInput`](../src/hooks/use-posts.ts#L37): Input schema for creating posts, including content, platforms, schedule, and media.
- [`MediaItem`](../src/hooks/use-posts.ts#L22): Describes media attachments in posts (URL, type, platform-specific handling).
- [`PlatformPost`](../src/hooks/use-posts.ts#L30): Post variant tailored to a specific platform, extending base post data.
- [`PostFilters`](../src/hooks/use-posts.ts#L13): Query parameters for filtering posts by status, date, profile, or queue.
- [`UpdatePostInput`](../src/hooks/use-posts.ts#L47): Input for updating existing posts, supporting partial changes.
- [`UploadedMedia`](../src/hooks/use-media.ts#L4): Result of media upload, including presigned URL and metadata.
- [`QueueSchedule`](../src/hooks/use-queue.ts#L23): Recurring schedule configuration (timezone, slots, days).
- [`QueueSlot`](../src/hooks/use-queue.ts#L16): Time slot in a queue (hour, minute, enabled status).
- [`PlatformSpecificData`](../src/lib/late-api/types.ts#L178): Union of platform-specific post data (e.g., `TikTokPlatformData`, `InstagramPlatformData`).
- [`Platform`](../src/lib/late-api/types.ts#L4): Union type or enum of supported platforms (e.g., 'tiktok', 'instagram').
- Additional interfaces: [`AuthState`](../src/stores/auth-store.ts#L16), [`AppState`](../src/stores/app-store.ts#L4), [`UsageStats`](../src/stores/auth-store.ts#L4).

## Enumerations

No explicit enum declarations found in exported symbols. Related type unions acting as enums:

- [`Platform`](../src/lib/late-api/types.ts#L4): `'tiktok' | 'youtube' | 'pinterest' | 'instagram' | 'facebook' | 'linkedin' | 'google-business' | 'telegram' | 'thread'`.
- [`AvatarStyle`](../src/lib/avatar.ts#L7): Predefined avatar generation styles.
- [`ScheduleType`](../src/app/dashboard/compose/_components/schedule-picker.tsx#L19): `'now' | 'schedule' | 'queue'`.
- [`CommonTimezone`](../src/lib/timezones.ts#L59): Curated list of common IANA timezones.

## Core Terms

- **Queue Slot**: A specific time interval (e.g., 09:00) in a daily schedule for posting. Used in [use-queue.ts](../src/hooks/use-queue.ts) for previewing and normalizing schedules. Relevance: Enables automated, recurring posts without daily manual intervention.
- **Account Health**: Monitors connection status and posting permissions per platform. Surfaced in [use-accounts.ts](../src/hooks/use-accounts.ts#L56) and dashboard components. Relevance: Prevents failed posts due to expired tokens or restrictions.
- **Platform-Specific Data**: Custom fields per platform (e.g., `InstagramPlatformData` for carousels). Defined in [types.ts](../src/lib/late-api/types.ts). Relevance: Ensures API compliance; validated before posting.
- **Presigned Media URL**: Temporary S3 upload link from [use-media.ts](../src/hooks/use-media.ts). Relevance: Secure client-side uploads with type/size validation (e.g., max 100MB for video).
- **Late Client**: API wrapper in [client.ts](../src/lib/late-api/client.ts) for server-side operations. Relevance: Abstracts auth and endpoints for accounts, posts, queues.

## Acronyms & Abbreviations

- **API**: Application Programming Interface, primarily Late API for backend operations.
- **S3**: Amazon Simple Storage Service, used for media presigning and storage.
- **IANA**: Internet Assigned Numbers Authority, standard for timezone identifiers (e.g., `America/Sao_Paulo`).

## Personas / Actors

- **Social Media Manager**: Manages multiple brand accounts; goals include bulk scheduling, queue automation, health monitoring. Workflows: Connect accounts via OAuth callback, compose cross-posts, view calendar/queue previews. Pain points addressed: Manual posting across platforms, timezones, inconsistent health checks.
- **Content Creator**: Solo user automating personal posts; focuses on media uploads, simple queues. Workflows: Quick compose, retry failed posts, profile switching. Pain points: File validation errors, timezone mismatches.

## Domain Rules & Invariants

- **Posting Constraints**: Posts must target valid accounts with healthy status; platform-specific data required (e.g., TikTok max 220 chars). Media validated via `isValidMediaType` (image/video max sizes).
- **Queue Invariants**: Slots normalized to 00-59 minutes; timezone must be valid IANA (`isValidTimezone`). Active queues post to assigned profiles/accounts.
- **Time Handling**: All schedules in user timezone (`getUserTimezone`), formatted via `formatInTimezone`. No DST ambiguities; uses `CommonTimezone` subset.
- **Compliance**: OAuth callbacks enforce entity selection; API keys validated server-side. Localization: Timezone-aware, no region-specific rules beyond platform APIs.

## Related Resources

- [Project Overview](./project-overview.md)
