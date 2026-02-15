import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { encrypt } from "@/lib/encryption";
import { getWorkspaceUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";

interface CredentialBody {
  type?: string;
  value?: string;
  metadata?: Prisma.InputJsonValue;
}

export async function GET(request: NextRequest) {
  try {
    const { workspace } = await getWorkspaceUser(request.headers);

    const credentials = await prisma.credential.findMany({
      where: {
        workspaceId: workspace.id,
        socialAccountId: null,
      },
      orderBy: { type: "asc" },
      select: {
        id: true,
        type: true,
        metadata: true,
      },
    });

    return NextResponse.json({ credentials });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "NO_WORKSPACE") {
      return NextResponse.json({ error: "No workspace" }, { status: 403 });
    }

    console.error("GET /api/credentials error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { workspace } = await getWorkspaceUser(request.headers);
    const body = (await request.json().catch(() => ({}))) as CredentialBody;

    if (!body.type || typeof body.type !== "string") {
      return NextResponse.json({ error: "Credential type is required" }, { status: 400 });
    }

    if (body.value !== undefined && typeof body.value !== "string") {
      return NextResponse.json({ error: "Credential value must be a string" }, { status: 400 });
    }

    const existingCredential = await prisma.credential.findUnique({
      where: {
        workspaceId_type: {
          workspaceId: workspace.id,
          type: body.type,
        },
      },
      select: {
        keyEnc: true,
      },
    });

    const value = body.value?.trim();
    const keyEnc = value
      ? encrypt(value)
      : existingCredential?.keyEnc;

    if (!keyEnc) {
      return NextResponse.json(
        { error: "Credential value is required when creating a credential" },
        { status: 400 },
      );
    }

    const credential = await prisma.credential.upsert({
      where: {
        workspaceId_type: {
          workspaceId: workspace.id,
          type: body.type,
        },
      },
      update: {
        keyEnc,
        metadata: body.metadata,
      },
      create: {
        workspaceId: workspace.id,
        type: body.type,
        keyEnc,
        metadata: body.metadata,
      },
      select: {
        id: true,
        type: true,
        metadata: true,
      },
    });

    return NextResponse.json({ credential });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "NO_WORKSPACE") {
      return NextResponse.json({ error: "No workspace" }, { status: 403 });
    }

    console.error("POST /api/credentials error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { workspace } = await getWorkspaceUser(request.headers);
    const url = new URL(request.url);
    const queryType = url.searchParams.get("type");
    const body = (await request.json().catch(() => ({}))) as { type?: string; id?: string };

    if (queryType || body.type) {
      const type = queryType || body.type;
      if (!type) {
        return NextResponse.json({ error: "Invalid credential type" }, { status: 400 });
      }

      await prisma.credential.deleteMany({
        where: {
          workspaceId: workspace.id,
          socialAccountId: null,
          type,
        },
      });

      return NextResponse.json({ success: true });
    }

    if (body.id) {
      await prisma.credential.deleteMany({
        where: {
          id: body.id,
          workspaceId: workspace.id,
          socialAccountId: null,
        },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Provide credential type or id" },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "NO_WORKSPACE") {
      return NextResponse.json({ error: "No workspace" }, { status: 403 });
    }

    console.error("DELETE /api/credentials error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
