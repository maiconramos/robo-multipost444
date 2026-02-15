import { NextRequest, NextResponse } from "next/server";
import { getStorage, getStorageProvider } from "@/lib/storage";
import { getWorkspaceUser } from "@/lib/auth/get-current-user";
import { handleApiError } from "@/lib/api/errors";
import {
  getUploadPolicy,
  UploadPolicyError,
  normalizeMimeType,
} from "@/lib/media/upload-policy";

export async function GET() {
  try {
    const provider = getStorageProvider();
    return NextResponse.json({
      provider,
      strategy:
        provider === "VERCEL_BLOB" ? "direct_client_upload" : "server_upload",
    });
  } catch (error) {
    console.error("GET /api/media/upload error:", error);
    return NextResponse.json({
      provider: "VERCEL_BLOB",
      strategy: "direct_client_upload",
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const provider = getStorageProvider();

    if (provider === "VERCEL_BLOB") {
      return NextResponse.json(
        {
          error:
            "Use /api/media/upload-token for Vercel Blob direct uploads.",
        },
        { status: 400 },
      );
    }

    if (provider === "URL_ONLY") {
      return NextResponse.json(
        { error: "File uploads are not available with URL_ONLY storage." },
        { status: 400 },
      );
    }

    const { workspace } = await getWorkspaceUser(request.headers);

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "file is required and must be a valid file" },
        { status: 400 },
      );
    }

    const filename =
      (file as File).name || formData.get("filename")?.toString() || "upload";
    const contentType =
      normalizeMimeType(file.type) ||
      formData.get("contentType")?.toString() ||
      "application/octet-stream";
    const folder = formData.get("folder")?.toString() || "posts";

    const policy = getUploadPolicy({ contentType, size: file.size });

    const storage = getStorage(provider);
    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await storage.upload(buffer, {
      filename,
      contentType: policy.normalizedContentType,
      workspaceId: workspace.id,
      folder,
    });

    return NextResponse.json({
      url: result.url,
      key: result.key,
      provider: result.provider,
      size: result.size,
      contentType: result.contentType,
      type: policy.mediaType,
      filename,
    });
  } catch (error) {
    if (error instanceof UploadPolicyError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return handleApiError(error, "POST /api/media/upload error");
  }
}
