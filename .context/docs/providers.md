# Providers (Per-Account Router)

## Overview

Provider selection is now **account-scoped** (not workspace-global) and driven by a
catalog manifest:

- Each `SocialAccount` defines:
  - `platform`
  - `connectionMethod` (`BYO_OAUTH`, `BYO_SYSTEM_USER`, `LATE`)
  - `providerIdentifier` (canonical provider key, e.g. `byo_oauth.instagram`)
  - `status`
- Each `PlatformPost` stores a provider snapshot:
  - `providerIdentifier`
- Scheduler/publisher resolves provider from `PlatformPost.providerIdentifier` first (snapshot),
  then falls back to account metadata for compatibility.

This enables mixed connectors in the same workspace (example: Instagram BYO + TikTok Late).

## Core Files

- `/Users/maiconramos/Documents/workspace/robo-multipost/src/lib/providers/index.ts`
- `/Users/maiconramos/Documents/workspace/robo-multipost/src/lib/providers/late-provider.ts`
- `/Users/maiconramos/Documents/workspace/robo-multipost/src/lib/providers/byo-provider.ts`
- `/Users/maiconramos/Documents/workspace/robo-multipost/src/lib/providers/catalog/types.ts`
- `/Users/maiconramos/Documents/workspace/robo-multipost/src/lib/providers/catalog/entries.ts`
- `/Users/maiconramos/Documents/workspace/robo-multipost/src/lib/providers/catalog/index.ts`
- `/Users/maiconramos/Documents/workspace/robo-multipost/src/lib/providers/runtime/registry.ts`
- `/Users/maiconramos/Documents/workspace/robo-multipost/src/app/api/cron/process/route.ts`
- `/Users/maiconramos/Documents/workspace/robo-multipost/src/app/api/posts/route.ts`

## Manifest Model

`ProviderCatalogEntry` centralizes provider metadata used by UI + API:

- `identifier`, `platform`, `connectionMethod`
- `status` (`active` or `coming_soon`)
- `connectMode` (`oauth`, `custom_fields`, `external_url`)
- `requiredCredentials`, `optionalCredentials`
- `composerSettingsKey`, `settingsSchemaKey`
- `supportsTwoStepSelection`, `capabilities`

## Runtime Resolution

- `connectionMethod = LATE`
  - Uses `LateProvider`
  - Reads `Credential.kind = LATE_API_KEY` for that `socialAccountId`
- `connectionMethod = BYO_OAUTH`
  - Uses `BYOProvider`
  - Reads account-scoped credentials (`APP_ID`, `APP_SECRET`, optional tokens)
- `connectionMethod = BYO_SYSTEM_USER`
  - Uses `BYOProvider`
  - Reads `SYSTEM_USER_TOKEN` + account `meta`

`providerIdentifier` is the canonical resolver key in:

- account creation/update (`/api/accounts/*`)
- OAuth connect/callback (`/api/accounts/connect`, `/api/accounts/callback`)
- post creation/update (`/api/posts`, `/api/public/v1/posts`)
- publish runner (`src/lib/posts/publish-runner.ts`)

## No Global Provider Mode

Removed from primary flow:

- workspace-wide `provider_mode`
- workspace-wide Late key as routing source

Provider decision is now always driven by selected account.

## OAuth Support Status

- Data model supports OAuth (`APP_ID`/`APP_SECRET`/`ACCESS_TOKEN`/`REFRESH_TOKEN`).
- Current MVP allows manual credential entry for account creation/edit.
- Full OAuth UI flow can be layered on top without changing the schema.

## Accounts UI Flow

`/dashboard/accounts` now uses a two-step creation flow:

1. User picks the channel icon (`instagram`, `facebook`, `threads`, `tiktok`).
2. User configures connection method + credentials for the selected channel.

This keeps provider selection account-scoped from the first interaction in the UI.

## Add a New Provider

1. Add/activate catalog entry in `src/lib/providers/catalog/entries.ts`.
2. Add runtime provider class (BYO or Late adapter).
3. Ensure runtime resolution in `src/lib/providers/runtime/registry.ts`.
4. (Optional) Add settings UI in `src/components/compose/settings/providers/`.
5. (Optional) Add platform schema in `src/lib/posts/platform-settings-schema.ts`.

Scaffold helper:

`npx tsx scripts/scaffold-provider.ts --identifier byo_oauth.instagram`
