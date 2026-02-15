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

const updateQueueSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  timezone: z.string().trim().min(1).optional(),
  slots: z.array(queueSlotSchema).optional(),
  active: z.boolean().optional(),
  setAsDefault: z.boolean().optional(),
});

type RouteContext = {
  params: Promise<{ queueId: string }>;
};

function normalizeSlotTime(slot: z.infer<typeof queueSlotSchema>) {
  if (slot.time) {
    return slot.time;
  }

  return `${String(slot.hour ?? 0).padStart(2, "0")}:${String(slot.minute ?? 0).padStart(2, "0")}`;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { queueId } = await context.params;
    const { workspace } = await getWorkspaceUser(request.headers);

    const queue = await prisma.queue.findFirst({
      where: {
        id: queueId,
        workspaceId: workspace.id,
      },
      include: {
        slots: {
          orderBy: [{ dayOfWeek: "asc" }, { time: "asc" }],
        },
      },
    });

    if (!queue) {
      return NextResponse.json({ error: "Queue not found" }, { status: 404 });
    }

    const nextSlots = queue.active
      ? getNextSlots(queue.slots, queue.timezone, 10).map((slot) => slot.toISOString())
      : [];

    return NextResponse.json({
      exists: true,
      schedule: serializeQueue(queue, nextSlots),
      nextSlots,
      queue: serializeQueue(queue, nextSlots),
    });
  } catch (error) {
    return handleApiError(error, "GET /api/queues/[queueId] error");
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { queueId } = await context.params;
    const { workspace } = await getWorkspaceUser(request.headers);
    const body = await request.json();
    const parsed = updateQueueSchema.parse(body);

    const existing = await prisma.queue.findFirst({
      where: {
        id: queueId,
        workspaceId: workspace.id,
      },
      include: {
        slots: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Queue not found" }, { status: 404 });
    }

    const queue = await prisma.$transaction(async (tx) => {
      if (parsed.setAsDefault) {
        await tx.queue.updateMany({
          where: {
            workspaceId: workspace.id,
            profileId: existing.profileId,
          },
          data: {
            isDefault: false,
          },
        });
      }

      await tx.queue.update({
        where: { id: queueId },
        data: {
          ...(parsed.name !== undefined ? { name: parsed.name } : {}),
          ...(parsed.timezone !== undefined ? { timezone: parsed.timezone } : {}),
          ...(parsed.active !== undefined ? { active: parsed.active } : {}),
          ...(parsed.setAsDefault ? { isDefault: true } : {}),
        },
      });

      if (parsed.slots) {
        await tx.queueSlot.deleteMany({ where: { queueId } });

        if (parsed.slots.length > 0) {
          await tx.queueSlot.createMany({
            data: parsed.slots.map((slot) => ({
              queueId,
              dayOfWeek: slot.dayOfWeek,
              time: normalizeSlotTime(slot),
            })),
          });
        }
      }

      const updated = await tx.queue.findUnique({
        where: { id: queueId },
        include: {
          slots: {
            orderBy: [{ dayOfWeek: "asc" }, { time: "asc" }],
          },
        },
      });

      if (!updated) {
        throw new Error("NOT_FOUND");
      }

      return updated;
    });

    const nextSlots = queue.active
      ? getNextSlots(queue.slots, queue.timezone, 10).map((slot) => slot.toISOString())
      : [];

    return NextResponse.json({ queue: serializeQueue(queue, nextSlots) });
  } catch (error) {
    return handleApiError(error, "PUT /api/queues/[queueId] error");
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { queueId } = await context.params;
    const { workspace } = await getWorkspaceUser(request.headers);

    const queue = await prisma.queue.findFirst({
      where: {
        id: queueId,
        workspaceId: workspace.id,
      },
      select: {
        id: true,
      },
    });

    if (!queue) {
      return NextResponse.json({ error: "Queue not found" }, { status: 404 });
    }

    await prisma.queue.delete({ where: { id: queueId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error, "DELETE /api/queues/[queueId] error");
  }
}
