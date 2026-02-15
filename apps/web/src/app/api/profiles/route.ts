import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api/errors";
import { serializeProfile } from "@/lib/api/serializers";

const createProfileSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export async function GET(request: NextRequest) {
  try {
    const { workspace } = await getWorkspaceUser(request.headers);

    const profiles = await prisma.profile.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      profiles: profiles.map(serializeProfile),
      count: profiles.length,
    });
  } catch (error) {
    return handleApiError(error, "GET /api/profiles error");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { workspace } = await getWorkspaceUser(request.headers);
    const body = await request.json();
    const { name } = createProfileSchema.parse(body);

    const profile = await prisma.profile.create({
      data: {
        workspaceId: workspace.id,
        name,
      },
    });

    return NextResponse.json({ profile: serializeProfile(profile) }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "POST /api/profiles error");
  }
}
