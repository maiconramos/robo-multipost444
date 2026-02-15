import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api/errors";
import { getNextAvailableSlot } from "@/lib/queue-scheduler";

export async function GET(request: NextRequest) {
  try {
    const { workspace } = await getWorkspaceUser(request.headers);
    const profileId = request.nextUrl.searchParams.get("profileId") ?? undefined;
    const queueId = request.nextUrl.searchParams.get("queueId") ?? undefined;

    if (!profileId) {
      return NextResponse.json({
        profileId: null,
        queueId: null,
        queueName: null,
        timezone: null,
        nextSlot: null,
      });
    }

    const queue = queueId
      ? await prisma.queue.findFirst({
          where: {
            id: queueId,
            workspaceId: workspace.id,
            profileId,
            active: true,
          },
          include: { slots: true },
        })
      : await prisma.queue.findFirst({
          where: {
            workspaceId: workspace.id,
            profileId,
            active: true,
          },
          include: { slots: true },
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        });

    if (!queue) {
      return NextResponse.json({
        profileId,
        queueId: null,
        queueName: null,
        timezone: null,
        nextSlot: null,
      });
    }

    const nextSlot = getNextAvailableSlot(queue.slots, queue.timezone);

    return NextResponse.json({
      profileId,
      queueId: queue.id,
      queueName: queue.name,
      timezone: queue.timezone,
      nextSlot: nextSlot?.toISOString() ?? null,
    });
  } catch (error) {
    return handleApiError(error, "GET /api/queues/next-slot error");
  }
}
