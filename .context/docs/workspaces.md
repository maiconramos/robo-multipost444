# Workspaces & Multi-Tenancy

## Overview

Robo MultiPost uses workspace-based multi-tenancy. Every piece of data (posts, accounts, queues, etc.) is scoped to a workspace via `workspaceId`.

## Data Model

```
Workspace
  ├── WorkspaceMember[] (userId, role)
  ├── Credential[] (encrypted provider keys)
  ├── SocialAccount[]
  ├── Profile[]
  ├── Post[]
  ├── Queue[]
  └── Invite[]
```

## Roles

| Role | Permissions |
|------|-------------|
| **OWNER** | Full access. Can invite, manage workspace, create new workspaces (if multi-workspace enabled) |
| **ADMIN** | Can invite, manage content and accounts |
| **MEMBER** | Can view and create content |

## Auto-Create Workspace

When a new user signs up and has no workspace membership, the system auto-creates a "Default" workspace and assigns the user as OWNER.

This happens via `ensureWorkspace(userId)` in `src/lib/auth/workspace.ts`.

## Invitation Flow

1. OWNER/ADMIN creates invite: `POST /api/workspaces/invite` with `{ workspaceId, email }`
2. System generates a unique token (UUID) with 7-day expiry
3. Invite link: `/invite/{token}`
4. Invitee clicks link:
   - If not logged in → redirect to `/login?returnUrl=/invite/{token}`
   - If logged in → auto-accepts invite, creates `WorkspaceMember(role: MEMBER)`
5. Invitee is redirected to `/dashboard`

## API Routes

### `GET /api/workspaces`
Lists workspaces for the current user.

### `POST /api/workspaces`
Creates a new workspace. Only available when `ENABLE_MULTI_WORKSPACE=true` and user is OWNER.

### `POST /api/workspaces/invite`
Creates an invitation. OWNER/ADMIN only.

### `PUT /api/workspaces/invite`
Accepts an invitation. Validates token, creates membership.

### `DELETE /api/workspaces/invite?id={inviteId}`
Revokes an invitation. OWNER/ADMIN only.

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/auth/workspace.ts` | `ensureWorkspace`, `getWorkspaceForUser`, `hasWorkspaceRole` |
| `src/app/api/workspaces/route.ts` | Workspace list and create |
| `src/app/api/workspaces/invite/route.ts` | Invite create, accept, revoke |
| `src/app/invite/[token]/page.tsx` | Invite acceptance page |
| `src/app/no-access/page.tsx` | Shown when user has no workspace |

## Critical Rule: Workspace-Scoped Queries

**Every database query MUST filter by `workspaceId`.** Never leak data across workspaces.

```typescript
// CORRECT
const posts = await prisma.post.findMany({
  where: { workspaceId: workspace.id },
});

// WRONG - leaks data across workspaces
const posts = await prisma.post.findMany();
```

## Feature Flag

```env
ENABLE_MULTI_WORKSPACE=false  # Default
```

When `false`, each user gets one workspace. When `true`, OWNERs can create additional workspaces.
