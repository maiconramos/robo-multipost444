import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api/errors";
import { getStorage, getStorageByProvider } from "@/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const { workspace } = await getWorkspaceUser(request.headers);

    const assets = await prisma.mediaAsset.findMany({
      where: { workspaceId: workspace.id },
      select: { id: true, key: true, provider: true },
    });

    // Best-effort batch delete from storage
    const storageDeletePromises = assets
      .filter((a) => a.key && a.provider !== "URL_ONLY")
      .map(async (asset) => {
        try {
          const storage =
            getStorageByProvider(asset.provider) ?? getStorage();
          await storage.delete(asset.key!);
        } catch (error) {
          console.error(
            `Failed to delete asset "${asset.id}" from storage:`,
            error,
          );
        }
      });

    await Promise.allSettled(storageDeletePromises);

    const deleteResult = await prisma.mediaAsset.deleteMany({
      where: { workspaceId: workspace.id },
    });

    return NextResponse.json({
      success: true,
      deletedCount: deleteResult.count,
    });
  } catch (error) {
    return handleApiError(error, "POST /api/media/clear error");
  }
}
