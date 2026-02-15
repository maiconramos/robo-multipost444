# Security & Compliance Notes

## Core Security Model

The app uses workspace-scoped multi-tenancy with encrypted credentials in the database.

- All credential secrets are encrypted with AES-256-GCM before persistence.
- Secrets are never returned in list APIs; UI gets masked values with `last4`.
- Credentials are account-scoped (`Credential.socialAccountId`) for publishing.
- Workspace-scoped credentials remain only for non-account integrations (for example AI key).

## Authentication and Authorization

- Session auth is provided by Better Auth.
- All protected API routes resolve the current workspace through `getWorkspaceUser(...)`.
- All data access must be filtered by `workspaceId`.
- Sensitive account credential mutations/reveal endpoints require role `OWNER` or `ADMIN`.

## Secret Handling Rules

- Do not place per-account app keys/tokens in environment variables.
- Per-account publishing credentials must live in DB rows (`Credential.kind` + `encryptedValue`).
- Reveal behavior is explicit and one-shot:
  - `POST /api/accounts/[accountId]/credentials/reveal` decrypts server-side and returns only in that response.
  - Frontend must not persist revealed secret state beyond current interaction.

## Environment Variables (Allowed)

- Required operational env vars:
  - `DATABASE_URL`
  - `ENCRYPTION_KEY`
  - `BETTER_AUTH_SECRET`
  - `BETTER_AUTH_URL`
  - `CRON_SECRET`
- Optional app flags/providers:
  - `ENABLE_MULTI_WORKSPACE`
  - `AI_PROVIDER`
  - storage provider env vars

Per-account connector secrets such as `APP_ID`, `APP_SECRET`, `ACCESS_TOKEN`, `SYSTEM_USER_TOKEN`, or `LATE_API_KEY` are DB-only.

## Data Classification

- Critical: encrypted credentials and tokens
- Sensitive: account metadata, workspace membership
- Public: non-secret UI labels/status and post content intended for publishing

## Related Resources

- [providers.md](./providers.md)
- [credentials.md](./credentials.md)
- [workspaces.md](./workspaces.md)
