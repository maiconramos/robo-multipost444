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
  requiredCredentialKindsFromEntry,
  resolveProviderFromPayload,
  toConnectionMethodFromEntry,
  toPlatformFromEntry,
} from "@/lib/providers/catalog/account-provider";
import {
  toSocialPlatform,
  pickPlatformUserId,
} from "@/lib/social-accounts";

const editableRoles = ["OWNER", "ADMIN"];

const connectionMethodSchema = z.enum(["BYO_OAUTH", "BYO_SYSTEM_USER", "LATE"]);
const credentialKindSchema = z.nativeEnum(CredentialKind);
const providerTypeSchema = z.enum(["late", "byo"]);

const accountCredentialInputSchema = z.object({
  kind: credentialKindSchema,
  value: z.string().trim().min(1),
  expiresAt: z.string().datetime().optional().nullable(),
});

const createAccountSchema = z.object({
  profileId: z.string().trim().min(1).optional(),
  providerIdentifier: z.string().trim().min(1).optional(),
  platform: z.string().trim().min(1).optional(),
  connectionMethod: connectionMethodSchema.optional(),
  providerType: providerTypeSchema.optional(),
  handle: z.string().trim().max(120).optional().default(""),
  name: z.string().trim().max(120).optional().nullable(),
  status: z.nativeEnum(SocialAccountStatus).optional(),
  meta: z.record(z.string(), z.unknown()).optional().nullable(),
  credentials: z.array(accountCredentialInputSchema).default([]),
});

async function resolveProfileId(workspaceId: string, requestedProfileId?: string) {
  if (requestedProfileId) {
    const existing = await prisma.profile.findFirst({
      where: { id: requestedProfileId, workspaceId },
      select: { id: true },
    });
    if (existing) {
      return existing.id;
    }
  }

  const first = await prisma.profile.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (first) {
    return first.id;
  }

  const created = await prisma.profile.create({
    data: {
      workspaceId,
      name: "Default",
    },
    select: { id: true },
  });
  return created.id;
}



export async function GET(request: NextRequest) {
  try {
    const { workspace } = await getWorkspaceUser(request.headers);
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get("profileId") || undefined;

    const accounts = await prisma.socialAccount.findMany({
      where: {
        workspaceId: workspace.id,
        ...(profileId ? { profileId } : {}),
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
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      accounts: accounts.map((account) => ({
        ...serializeAccount(account),
        credentials: account.credentials.map((credential) => ({
          kind: credential.kind,
          last4: credential.last4,
          maskedValue: credential.last4 ? `••••••••${credential.last4}` : null,
          expiresAt: credential.expiresAt?.toISOString(),
          updatedAt: credential.updatedAt.toISOString(),
        })),
      })),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "NO_WORKSPACE") {
      return NextResponse.json({ error: "No workspace" }, { status: 403 });
    }

    console.error("GET /api/accounts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { workspace, member } = await getWorkspaceUser(request.headers);
    if (!editableRoles.includes(member.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rawBody = await request.json().catch(() => ({}));
    const body = createAccountSchema.parse(rawBody);

    const providerEntry = resolveProviderFromPayload({
      providerIdentifier: body.providerIdentifier,
      platform: body.platform,
      connectionMethod: body.connectionMethod,
      providerType: body.providerType,
      onlyActive: true,
    });

    if (!providerEntry) {
      return NextResponse.json(
        { error: "Invalid provider selection" },
        { status: 400 },
      );
    }

    const platform = toPlatformFromEntry(providerEntry);
    const connectionMethod = toConnectionMethodFromEntry(providerEntry);
    const requiredKinds = requiredCredentialKindsFromEntry(
      providerEntry,
    ) as CredentialKind[];
    const providedKinds = new Set(body.credentials.map((credential) => credential.kind));

    for (const kind of requiredKinds) {
      if (!providedKinds.has(kind)) {
        return NextResponse.json(
          { error: `Credential '${kind}' is required for ${connectionMethod}` },
          { status: 400 },
        );
      }
    }

    const duplicateKinds = body.credentials
      .map((credential) => credential.kind)
      .filter((kind, index, values) => values.indexOf(kind) !== index);
    if (duplicateKinds.length > 0) {
      return NextResponse.json(
        { error: `Duplicated credential kinds: ${[...new Set(duplicateKinds)].join(", ")}` },
        { status: 400 },
      );
    }

    const profileId = await resolveProfileId(workspace.id, body.profileId);
    const meta = body.meta ?? null;
    const metaValue =
      meta === null ? Prisma.JsonNull : (meta as Prisma.InputJsonValue);
    const nextHandle = body.handle || `pending_${Date.now()}`;

    const account = await prisma.socialAccount.create({
      data: {
        workspaceId: workspace.id,
        profileId,
        platform: toSocialPlatform(platform),
        connectionMethod,
        providerIdentifier: providerEntry.identifier,
        status: connectionMethod === "BYO_OAUTH" ? "DISCONNECTED" : (body.status ?? "CONNECTED"),
        handle: nextHandle,
        name: body.name ?? null,
        meta: metaValue,
        // Legacy compatibility fields
        username: nextHandle,
        displayName: body.name ?? nextHandle,
        providerType: providerTypeFromEntry(providerEntry),
        isActive: (body.status ?? "CONNECTED") === "CONNECTED",
        oauthMetadata: metaValue,
        platformUserId: pickPlatformUserId(meta) ?? null,
      },
    });

    for (const credential of body.credentials) {
      const { encryptedValue, last4 } = encryptAccountSecret(credential.value);
      await prisma.credential.upsert({
        where: {
          socialAccountId_kind: {
            socialAccountId: account.id,
            kind: credential.kind,
          },
        },
        update: {
          encryptedValue,
          last4,
          expiresAt: credential.expiresAt ? new Date(credential.expiresAt) : null,
          workspaceId: workspace.id,
        },
        create: {
          workspaceId: workspace.id,
          socialAccountId: account.id,
          kind: credential.kind,
          encryptedValue,
          last4,
          expiresAt: credential.expiresAt ? new Date(credential.expiresAt) : null,
        },
      });
    }

    const created = await prisma.socialAccount.findFirst({
      where: { id: account.id, workspaceId: workspace.id },
      include: {
        credentials: {
          select: {
            kind: true,
            last4: true,
            expiresAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!created) {
      return NextResponse.json({ error: "Failed to load created account" }, { status: 500 });
    }

    return NextResponse.json(
      {
        account: {
          ...serializeAccount(created),
          credentials: created.credentials.map((credential) => ({
            kind: credential.kind,
            last4: credential.last4,
            maskedValue: credential.last4 ? `••••••••${credential.last4}` : null,
            expiresAt: credential.expiresAt?.toISOString(),
            updatedAt: credential.updatedAt.toISOString(),
          })),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          issues: error.issues,
        },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "NO_WORKSPACE") {
      return NextResponse.json({ error: "No workspace" }, { status: 403 });
    }

    console.error("POST /api/accounts error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
