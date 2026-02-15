import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import {
  authenticatePublicApi,
  publicApiResponse,
} from "@/lib/api-keys/middleware";
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
  const authResult = await authenticatePublicApi(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const provider = getStorageProvider();
    if (provider !== "VERCEL_BLOB") {
      return publicApiResponse(
        {
          error:
            "Upload token endpoint is available only when STORAGE_PROVIDER=VERCEL_BLOB.",
        },
        authResult,
        { status: 400 },
      );
    }

    const body = await request.json();
    const parsed = uploadTokenSchema.parse(body);

    const policy = getUploadPolicy({
      contentType: parsed.contentType,
      size: parsed.size,
    });

    const pathname = buildUploadPathname({
      workspaceId: authResult.workspaceId,
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

    return publicApiResponse(
      {
        token,
        pathname,
        provider: "VERCEL_BLOB",
        multipartRecommended: policy.multipartRecommended,
        maxSizeBytes: policy.maxSizeBytes,
        expiresAt: expiresAt.toISOString(),
      },
      authResult,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return publicApiResponse(
        {
          error: "Validation failed",
          issues: error.issues,
        },
        authResult,
        { status: 400 },
      );
    }

    if (error instanceof UploadPolicyError) {
      return publicApiResponse({ error: error.message }, authResult, {
        status: 400,
      });
    }

    console.error("POST /api/public/v1/media/token error:", error);
    return publicApiResponse(
      { error: "Internal server error" },
      authResult,
      { status: 500 },
    );
  }
}
