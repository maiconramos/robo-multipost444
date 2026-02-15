import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { getWorkspaceUser } from "@/lib/auth/get-current-user";
import { handleApiError } from "@/lib/api/errors";
import { getStorageProvider } from "@/lib/storage";
import { buildUploadPathname } from "@/lib/media/upload-pathname";
import { getUploadPolicy, UploadPolicyError } from "@/lib/media/upload-policy";

const TOKEN_TTL_MS = 15 * 60 * 1000;

const uploadTokenSchema = z.object({
  filename: z.string().trim().min(1),
  contentType: z.string().trim().min(1),
  size: z.number().int().positive(),
  folder: z.enum(["posts", "thumbnails"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const provider = getStorageProvider();
    if (provider !== "VERCEL_BLOB") {
      return NextResponse.json(
        {
          error:
            "Upload token endpoint is available only when STORAGE_PROVIDER=VERCEL_BLOB.",
        },
        { status: 400 },
      );
    }

    const { workspace } = await getWorkspaceUser(request.headers);
    const body = await request.json();
    const parsed = uploadTokenSchema.parse(body);

    const policy = getUploadPolicy({
      contentType: parsed.contentType,
      size: parsed.size,
    });

    const pathname = buildUploadPathname({
      workspaceId: workspace.id,
      filename: parsed.filename,
      folder: parsed.folder,
    });

    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);
    const token = await generateClientTokenFromReadWriteToken({
      pathname,
      allowedContentTypes: [policy.normalizedContentType],
      maximumSizeInBytes: policy.maxSizeBytes,
      validUntil: expiresAt.getTime(),
      addRandomSuffix: false,
    });

    return NextResponse.json({
      token,
      pathname,
      provider: "VERCEL_BLOB",
      multipartRecommended: policy.multipartRecommended,
      maxSizeBytes: policy.maxSizeBytes,
      expiresAt: expiresAt.toISOString(),
    });
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

    if (error instanceof UploadPolicyError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return handleApiError(error, "POST /api/media/upload-token error");
  }
}
