import { NextRequest, NextResponse } from "next/server";
import { CredentialKind, Prisma, SocialAccountStatus } from "@prisma/client";
import { z } from "zod";
import { getWorkspaceUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import {
  ACCOUNT_CREDENTIAL_KINDS,
  encryptAccountSecret,
} from "@/lib/account-credentials";
import { serializeAccount } from "@/lib/api/serializers";
import {
  providerTypeFromEntry,
  resolveProviderFromPayload,
  toConnectionMethodFromEntry,
  toPlatformFromEntry,
} from "@/lib/providers/catalog/account-provider";
import {
  toSocialPlatform,
  pickPlatformUserId,
} from "@/lib/social-accounts";

const editableRoles = ["OWNER", "ADMIN"];
const credentialKindSchema = z.nativeEnum(CredentialKind);
const connectionMethodSchema = z.enum(["BYO_OAUTH", "BYO_SYSTEM_USER", "LATE"]);

const updateCredentialSchema = z.object({
  kind: credentialKindSchema,
  value: z.string().trim().min(1).optional(),
  remove: z.boolean().optional().default(false),
  expiresAt: z.string().datetime().nullable().optional(),
});

const updateAccountSchema = z.object({
  profileId: z.string().trim().min(1).optional(),
  providerIdentifier: z.string().trim().min(1).optional(),
  platform: z.string().trim().min(1).optional(),
  connectionMethod: connectionMethodSchema.optional(),
  handle: z.string().trim().min(1).max(120).optional(),
  name: z.string().trim().max(120).nullable().optional(),
  status: z.nativeEnum(SocialAccountStatus).optional(),
  meta: z.record(z.string(), z.unknown()).nullable().optional(),
  credentials: z.array(updateCredentialSchema).optional(),
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ accountId: string }> },
) {
  try {
    const { workspace } = await getWorkspaceUser(request.headers);
    const { accountId } = await context.params;

    const account = await prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        workspaceId: workspace.id,
      },
      include: {
        credentials: {
          where: {
            kind: {
              in: ACCOUNT_CREDENTIAL_KINDS,
            },
          },
          select: {
            kind: true,
            last4: true,
            expiresAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({
      account: {
        ...serializeAccount(account),
        credentials: account.credentials.map((credential) => ({
          kind: credential.kind,
          last4: credential.last4,
          maskedValue: credential.last4 ? `••••••••${credential.last4}` : null,
          expiresAt: credential.expiresAt?.toISOString(),
          updatedAt: credential.updatedAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "NO_WORKSPACE") {
      return NextResponse.json({ error: "No workspace" }, { status: 403 });
    }

    console.error("GET /api/accounts/[accountId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ accountId: string }> },
) {
  try {
    const { workspace, member } = await getWorkspaceUser(request.headers);
    if (!editableRoles.includes(member.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { accountId } = await context.params;
    const rawBody = await request.json().catch(() => ({}));
    const body = updateAccountSchema.parse(rawBody);

    const existing = await prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        workspaceId: workspace.id,
      },
      include: {
        credentials: {
          where: {
            kind: {
              in: ACCOUNT_CREDENTIAL_KINDS,
            },
          },
          select: { kind: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    const providerChanged =
      body.providerIdentifier !== undefined ||
      body.platform !== undefined ||
      body.connectionMethod !== undefined;
    const providerEntry = resolveProviderFromPayload({
      providerIdentifier: body.providerIdentifier ?? existing.providerIdentifier,
      platform: body.platform ?? serializeAccount(existing).platform,
      connectionMethod: body.connectionMethod ?? existing.connectionMethod,
      onlyActive: providerChanged,
    });

    if (!providerEntry) {
      return NextResponse.json(
        { error: "Invalid provider selection" },
        { status: 400 },
      );
    }

    const nextConnectionMethod = toConnectionMethodFromEntry(providerEntry);
    const nextPlatform = toPlatformFromEntry(providerEntry);

    if (body.profileId) {
      const profile = await prisma.profile.findFirst({
        where: {
          id: body.profileId,
          workspaceId: workspace.id,
        },
        select: { id: true },
      });
      if (!profile) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }
    }

    if (body.credentials && body.credentials.length > 0) {
      const duplicateKinds = body.credentials
        .map((credential) => credential.kind)
        .filter((kind, index, values) => values.indexOf(kind) !== index);

      if (duplicateKinds.length > 0) {
        return NextResponse.json(
          { error: `Duplicated credential kinds: ${[...new Set(duplicateKinds)].join(", ")}` },
          { status: 400 },
        );
      }
    }

    const updateData: Prisma.SocialAccountUncheckedUpdateInput = {
      ...(body.profileId ? { profileId: body.profileId } : {}),
      platform: toSocialPlatform(nextPlatform),
      connectionMethod: nextConnectionMethod,
      providerIdentifier: providerEntry.identifier,
      ...(body.handle ? { handle: body.handle, username: body.handle } : {}),
      ...(body.name !== undefined
        ? {
          name: body.name,
          displayName: body.name ?? existing.displayName,
        }
        : {}),
      ...(body.meta !== undefined
        ? {
          meta:
            body.meta === null
              ? Prisma.JsonNull
              : (body.meta as Prisma.InputJsonValue),
          oauthMetadata:
            body.meta === null
              ? Prisma.JsonNull
              : (body.meta as Prisma.InputJsonValue),
        }
        : {}),
      ...(body.status ? { status: body.status, isActive: body.status === "CONNECTED" } : {}),
      providerType: providerTypeFromEntry(providerEntry),
      platformUserId: pickPlatformUserId(
        body.meta
          ? (body.meta as Record<string, unknown>)
          : (existing.meta as Record<string, unknown>),
      ),
    };

    await prisma.socialAccount.update({
      where: { id: existing.id },
      data: updateData,
    });

    if (body.credentials) {
      for (const credential of body.credentials) {
        if (credential.remove) {
          await prisma.credential.deleteMany({
            where: {
              workspaceId: workspace.id,
              socialAccountId: existing.id,
              kind: credential.kind,
            },
          });
          continue;
        }

        if (!credential.value) {
          continue;
        }

        const { encryptedValue, last4 } = encryptAccountSecret(credential.value);

        await prisma.credential.upsert({
          where: {
            socialAccountId_kind: {
              socialAccountId: existing.id,
              kind: credential.kind,
            },
          },
          update: {
            encryptedValue,
            last4,
            expiresAt: credential.expiresAt ? new Date(credential.expiresAt) : null,
          },
          create: {
            workspaceId: workspace.id,
            socialAccountId: existing.id,
            kind: credential.kind,
            encryptedValue,
            last4,
            expiresAt: credential.expiresAt ? new Date(credential.expiresAt) : null,
          },
        });
      }
    }

    const updated = await prisma.socialAccount.findFirst({
      where: {
        id: existing.id,
        workspaceId: workspace.id,
      },
      include: {
        credentials: {
          where: {
            kind: {
              in: ACCOUNT_CREDENTIAL_KINDS,
            },
          },
          select: {
            kind: true,
            last4: true,
            expiresAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    if (!updated) {
      return NextResponse.json({ error: "Account not found after update" }, { status: 404 });
    }

    return NextResponse.json({
      account: {
        ...serializeAccount(updated),
        credentials: updated.credentials.map((credential) => ({
          kind: credential.kind,
          last4: credential.last4,
          maskedValue: credential.last4 ? `••••••••${credential.last4}` : null,
          expiresAt: credential.expiresAt?.toISOString(),
          updatedAt: credential.updatedAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", issues: error.issues },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "NO_WORKSPACE") {
      return NextResponse.json({ error: "No workspace" }, { status: 403 });
    }

    console.error("PUT /api/accounts/[accountId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ accountId: string }> },
) {
  try {
    const { workspace, member } = await getWorkspaceUser(request.headers);
    if (!editableRoles.includes(member.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { accountId } = await context.params;

    const account = await prisma.socialAccount.findFirst({
      where: {
        id: accountId,
        workspaceId: workspace.id,
      },
    });

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    // Delete related records manually due to foreign key constraints and lack of ON DELETE CASCADE
    await prisma.platformPost.deleteMany({
      where: {
        accountId: accountId,
      },
    });

    const deletedCredentials = await prisma.credential.deleteMany({
      where: {
        socialAccountId: accountId,
      },
    });

    await prisma.socialAccount.delete({
      where: {
        id: accountId,
      },
    });

    return NextResponse.json({ success: true, deletedCredentials: deletedCredentials.count });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "NO_WORKSPACE") {
      return NextResponse.json({ error: "No workspace" }, { status: 403 });
    }

    console.error("DELETE /api/accounts/[accountId] error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
