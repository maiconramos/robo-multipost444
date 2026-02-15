import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api/errors";
import { getStorage, getStorageByProvider } from "@/lib/storage";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ assetId: string }> },
) {
  try {
    const { assetId } = await context.params;
    const { workspace } = await getWorkspaceUser(request.headers);

    const asset = await prisma.mediaAsset.findFirst({
      where: { id: assetId, workspaceId: workspace.id },
    });

    if (!asset) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Best-effort storage deletion (same pattern as post deletion)
    if (asset.key && asset.provider !== "URL_ONLY") {
      try {
        const storage =
          getStorageByProvider(asset.provider) ?? getStorage();
        await storage.delete(asset.key);
      } catch (error) {
        console.error(
          `Failed to delete asset "${assetId}" from storage:`,
          error,
        );
      }
    }

    await prisma.mediaAsset.delete({ where: { id: assetId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "DELETE /api/media/[assetId] error");
  }
}
