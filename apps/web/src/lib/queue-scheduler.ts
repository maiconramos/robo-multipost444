import { fromZonedTime, toZonedTime } from "date-fns-tz";

export interface SchedulableQueueSlot {
  dayOfWeek: number;
  time?: string;
  hour?: number;
  minute?: number;
}

interface SlotTime {
  hour: number;
  minute: number;
}

function parseSlotTime(slot: SchedulableQueueSlot): SlotTime | null {
  if (slot.time) {
    const [hourRaw, minuteRaw] = slot.time.split(":");
    const hour = Number(hourRaw);
    const minute = Number(minuteRaw);

    if (Number.isInteger(hour) && Number.isInteger(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return { hour, minute };
    }
  }

  if (
    Number.isInteger(slot.hour) &&
    Number.isInteger(slot.minute) &&
    typeof slot.hour === "number" &&
    typeof slot.minute === "number" &&
    slot.hour >= 0 &&
    slot.hour <= 23 &&
    slot.minute >= 0 &&
    slot.minute <= 59
  ) {
    return { hour: slot.hour, minute: slot.minute };
  }

  return null;
}

function normalizeSlot(slot: SchedulableQueueSlot): SchedulableQueueSlot | null {
  if (!Number.isInteger(slot.dayOfWeek) || slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
    return null;
  }

  const parsed = parseSlotTime(slot);
  if (!parsed) {
    return null;
  }

  return {
    dayOfWeek: slot.dayOfWeek,
    time: `${parsed.hour.toString().padStart(2, "0")}:${parsed.minute.toString().padStart(2, "0")}`,
    hour: parsed.hour,
    minute: parsed.minute,
  };
}

function getNextOccurrence(
  slot: SchedulableQueueSlot,
  timezone: string,
  after: Date
): Date | null {
  const normalized = normalizeSlot(slot);
  if (!normalized) {
    return null;
  }

  const zonedAfter = toZonedTime(after, timezone);
  const dayOffset = (normalized.dayOfWeek - zonedAfter.getDay() + 7) % 7;

  const localCandidate = new Date(zonedAfter);
  localCandidate.setDate(zonedAfter.getDate() + dayOffset);
  localCandidate.setHours(normalized.hour ?? 0, normalized.minute ?? 0, 0, 0);

  let utcCandidate = fromZonedTime(localCandidate, timezone);

  if (utcCandidate.getTime() <= after.getTime()) {
    localCandidate.setDate(localCandidate.getDate() + 7);
    utcCandidate = fromZonedTime(localCandidate, timezone);
  }

  return utcCandidate;
}

/**
 * Compute next N queue slots from now.
 * Considers queue timezone, day-of-week, and time slots.
 */
export function getNextSlots(
  slots: SchedulableQueueSlot[],
  timezone: string,
  count: number,
  after: Date = new Date()
): Date[] {
  if (!Array.isArray(slots) || slots.length === 0 || count <= 0) {
    return [];
  }

  const occurrences = slots
    .map((slot) => {
      const date = getNextOccurrence(slot, timezone, after);
      if (!date) {
        return null;
      }

      return { slot, date };
    })
    .filter((entry): entry is { slot: SchedulableQueueSlot; date: Date } => Boolean(entry));

  const results: Date[] = [];

  while (results.length < count && occurrences.length > 0) {
    occurrences.sort((a, b) => a.date.getTime() - b.date.getTime());

    const next = occurrences[0];
    results.push(next.date);

    const afterCurrent = new Date(next.date.getTime() + 1000);
    const following = getNextOccurrence(next.slot, timezone, afterCurrent);

    if (!following) {
      occurrences.shift();
      continue;
    }

    occurrences[0] = { slot: next.slot, date: following };
  }

  return results;
}

/**
 * Get the next available slot (first slot in the future).
 */
export function getNextAvailableSlot(
  slots: SchedulableQueueSlot[],
  timezone: string,
  after: Date = new Date()
): Date | null {
  const [slot] = getNextSlots(slots, timezone, 1, after);
  return slot ?? null;
}
