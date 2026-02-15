# Credentials (Per-Account + Workspace)

## Storage Model

All sensitive values are stored encrypted with AES-256-GCM in database tables.

## Account Credentials

`Credential` rows linked to `socialAccountId` use:

- `kind`:
  - `APP_ID`
  - `APP_SECRET`
  - `ACCESS_TOKEN`
  - `REFRESH_TOKEN`
  - `SYSTEM_USER_TOKEN`
  - `LATE_API_KEY`
- `encryptedValue`: encrypted secret
- `last4`: last 4 chars for masked display
- `expiresAt`: optional expiry

Constraint:

- unique per account per kind: `unique(socialAccountId, kind)`

## Workspace Credentials

Workspace-level credentials (for example AI config) are still stored in the same table using legacy `type` + `keyEnc` rows with `socialAccountId = null`.

This keeps backward compatibility while account publishing credentials are isolated by `socialAccountId`.

## UI Security Rules

- List endpoints return masked values only (`••••••••abcd` style).
- Plain secret is never returned by default account list/detail APIs.
- “Show once” endpoint:
  - `POST /api/accounts/[accountId]/credentials/reveal`
  - decrypts server-side and returns value in that response only
  - no persisted “revealed” state

## RBAC

Editing/revealing account credentials requires workspace role:

- `OWNER`
- `ADMIN`

Members can view account metadata but cannot mutate/reveal secrets.
