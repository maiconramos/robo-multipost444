import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api/errors";
import { serializeMediaAsset } from "@/lib/api/serializers";

const listSchema = z.object({
  type: z.enum(["image", "video"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

const createSchema = z.object({
  type: z.enum(["image", "video"]),
  url: z.string().url(),
  key: z.string().optional(),
  provider: z.string().optional(),
  filename: z.string().optional(),
  contentType: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  size: z.number().int().nonnegative().optional(),
  duration: z.number().int().nonnegative().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { workspace } = await getWorkspaceUser(request.headers);
    const query = listSchema.parse({
      type: request.nextUrl.searchParams.get("type") ?? undefined,
      page: request.nextUrl.searchParams.get("page") ?? undefined,
      limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    });

    const where = {
      workspaceId: workspace.id,
      ...(query.type ? { type: query.type } : {}),
    };

    const [assets, total] = await Promise.all([
      prisma.mediaAsset.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.mediaAsset.count({ where }),
    ]);

    return NextResponse.json({
      assets: assets.map(serializeMediaAsset),
      total,
      page: query.page,
      limit: query.limit,
      pages: Math.ceil(total / query.limit),
    });
  } catch (error) {
    return handleApiError(error, "GET /api/media error");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { workspace } = await getWorkspaceUser(request.headers);
    const body = await request.json();
    const parsed = createSchema.parse(body);

    const asset = await prisma.mediaAsset.create({
      data: {
        workspaceId: workspace.id,
        ...parsed,
      },
    });

    return NextResponse.json(
      { asset: serializeMediaAsset(asset) },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error, "POST /api/media error");
  }
}
