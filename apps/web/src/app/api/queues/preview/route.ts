import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api/errors";
import { getNextSlots } from "@/lib/queue-scheduler";

export async function GET(request: NextRequest) {
  try {
    const { workspace } = await getWorkspaceUser(request.headers);
    const profileId = request.nextUrl.searchParams.get("profileId") ?? undefined;
    const countRaw = Number(request.nextUrl.searchParams.get("count") ?? "10");
    const count = Number.isFinite(countRaw) ? Math.min(Math.max(Math.floor(countRaw), 1), 100) : 10;

    if (!profileId) {
      return NextResponse.json({ profileId: null, count, slots: [] });
    }

    const queues = await prisma.queue.findMany({
      where: {
        workspaceId: workspace.id,
        profileId,
        active: true,
      },
      include: {
        slots: true,
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });

    const slots = queues
      .flatMap((queue) =>
        getNextSlots(queue.slots, queue.timezone, count).map((slot) => slot.toISOString())
      )
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .slice(0, count);

    return NextResponse.json({ profileId, count, slots });
  } catch (error) {
    return handleApiError(error, "GET /api/queues/preview error");
  }
}
