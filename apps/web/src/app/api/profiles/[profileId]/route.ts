import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api/errors";
import { serializeProfile } from "@/lib/api/serializers";

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  timezone: z.string().optional(),
});

type RouteContext = {
  params: Promise<{ profileId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { profileId } = await context.params;
    const { workspace } = await getWorkspaceUser(request.headers);

    const profile = await prisma.profile.findFirst({
      where: {
        id: profileId,
        workspaceId: workspace.id,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({ profile: serializeProfile(profile) });
  } catch (error) {
    return handleApiError(error, "GET /api/profiles/[profileId] error");
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { profileId } = await context.params;
    const { workspace } = await getWorkspaceUser(request.headers);

    const body = await request.json();
    const parsed = updateProfileSchema.parse(body);

    const existing = await prisma.profile.findFirst({
      where: {
        id: profileId,
        workspaceId: workspace.id,
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (!parsed.name) {
      const current = await prisma.profile.findUnique({ where: { id: profileId } });
      if (!current) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }

      return NextResponse.json({ profile: serializeProfile(current) });
    }

    const profile = await prisma.profile.update({
      where: { id: profileId },
      data: {
        name: parsed.name,
      },
    });

    return NextResponse.json({ profile: serializeProfile(profile) });
  } catch (error) {
    return handleApiError(error, "PUT /api/profiles/[profileId] error");
  }
}
