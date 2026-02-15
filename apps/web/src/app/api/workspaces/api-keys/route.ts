import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceUser } from "@/lib/auth/get-current-user";
import { hasWorkspaceRole } from "@/lib/auth/workspace";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api/errors";
import { generateApiKey } from "@/lib/api-keys";

const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(100),
  expiresIn: z
    .enum(["30d", "90d", "1y", "never"])
    .optional()
    .default("never"),
});

function computeExpiresAt(
  expiresIn: "30d" | "90d" | "1y" | "never"
): Date | null {
  if (expiresIn === "never") return null;

  const now = new Date();
  switch (expiresIn) {
    case "30d":
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    case "90d":
      return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    case "1y":
      return new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  }
}

export async function GET(request: NextRequest) {
  try {
    const { workspace } = await getWorkspaceUser(request.headers);

    const apiKeys = await prisma.apiKey.findMany({
      where: { workspaceId: workspace.id },
      select: {
        id: true,
        name: true,
        prefix: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      apiKeys: apiKeys.map((key) => ({
        id: key.id,
        name: key.name,
        prefix: key.prefix,
        lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
        expiresAt: key.expiresAt?.toISOString() ?? null,
        revokedAt: key.revokedAt?.toISOString() ?? null,
        createdAt: key.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleApiError(error, "GET /api/workspaces/api-keys error");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { workspace, user } = await getWorkspaceUser(request.headers);

    // Only OWNER and ADMIN can create API keys
    const isAllowed = await hasWorkspaceRole(user.id, workspace.id, [
      "OWNER",
      "ADMIN",
    ]);
    if (!isAllowed) {
      return NextResponse.json(
        { error: "Only workspace owners and admins can create API keys" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = createApiKeySchema.parse(body);
    const expiresAt = computeExpiresAt(parsed.expiresIn);
    const { key, prefix, keyHash } = generateApiKey();

    await prisma.apiKey.create({
      data: {
        workspaceId: workspace.id,
        name: parsed.name,
        prefix,
        keyHash,
        expiresAt,
      },
    });

    return NextResponse.json(
      {
        key,
        prefix,
        name: parsed.name,
        expiresAt: expiresAt?.toISOString() ?? null,
      },
      { status: 201 }
    );
  } catch (error) {
    return handleApiError(error, "POST /api/workspaces/api-keys error");
  }
}
