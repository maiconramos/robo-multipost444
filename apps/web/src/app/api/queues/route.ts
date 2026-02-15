import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api/errors";
import { serializeQueue } from "@/lib/api/serializers";
import { getNextSlots } from "@/lib/queue-scheduler";

const queueSlotSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    time: z
      .string()
      .trim()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
      .optional(),
    hour: z.number().int().min(0).max(23).optional(),
    minute: z.number().int().min(0).max(59).optional(),
  })
  .refine(
    (slot) => Boolean(slot.time) || (typeof slot.hour === "number" && typeof slot.minute === "number"),
    "Queue slot must include time or hour/minute"
  );

const createQueueSchema = z.object({
  profileId: z.string().trim().min(1),
  name: z.string().trim().min(1).max(120),
  timezone: z.string().trim().min(1),
  slots: z.array(queueSlotSchema).default([]),
  active: z.boolean().optional(),
});

function normalizeSlotTime(slot: z.infer<typeof queueSlotSchema>) {
  if (slot.time) {
    return slot.time;
  }

  return `${String(slot.hour ?? 0).padStart(2, "0")}:${String(slot.minute ?? 0).padStart(2, "0")}`;
}

export async function GET(request: NextRequest) {
  try {
    const { workspace } = await getWorkspaceUser(request.headers);
    const profileId = request.nextUrl.searchParams.get("profileId") ?? undefined;

    const queues = await prisma.queue.findMany({
      where: {
        workspaceId: workspace.id,
        ...(profileId ? { profileId } : {}),
      },
      include: {
        slots: {
          orderBy: [{ dayOfWeek: "asc" }, { time: "asc" }],
        },
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });

    const serialized = queues.map((queue) => {
      const nextSlots = queue.active
        ? getNextSlots(queue.slots, queue.timezone, 10).map((slot) => slot.toISOString())
        : [];

      return serializeQueue(queue, nextSlots);
    });

    return NextResponse.json({ queues: serialized, count: serialized.length });
  } catch (error) {
    return handleApiError(error, "GET /api/queues error");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { workspace } = await getWorkspaceUser(request.headers);
    const body = await request.json();
    const parsed = createQueueSchema.parse(body);

    const profile = await prisma.profile.findFirst({
      where: {
        id: parsed.profileId,
        workspaceId: workspace.id,
      },
      select: { id: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const existingCount = await prisma.queue.count({
      where: {
        workspaceId: workspace.id,
        profileId: parsed.profileId,
      },
    });

    const queue = await prisma.queue.create({
      data: {
        workspaceId: workspace.id,
        profileId: parsed.profileId,
        name: parsed.name,
        timezone: parsed.timezone,
        active: parsed.active ?? true,
        isDefault: existingCount === 0,
        slots: {
          create: parsed.slots.map((slot) => ({
            dayOfWeek: slot.dayOfWeek,
            time: normalizeSlotTime(slot),
          })),
        },
      },
      include: {
        slots: {
          orderBy: [{ dayOfWeek: "asc" }, { time: "asc" }],
        },
      },
    });

    const nextSlots = queue.active
      ? getNextSlots(queue.slots, queue.timezone, 10).map((slot) => slot.toISOString())
      : [];

    return NextResponse.json({ queue: serializeQueue(queue, nextSlots) }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "POST /api/queues error");
  }
}
