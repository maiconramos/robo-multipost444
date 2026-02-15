export const MIN_SCHEDULE_LEAD_MINUTES = 10;

export interface ScheduleValidationFailure {
  ok: false;
  minScheduledAt: Date;
  message: string;
}

export interface ScheduleValidationSuccess {
  ok: true;
}

export type ScheduleValidationResult =
  | ScheduleValidationSuccess
  | ScheduleValidationFailure;

export function getMinimumScheduledAt(now: Date = new Date()): Date {
  return new Date(now.getTime() + MIN_SCHEDULE_LEAD_MINUTES * 60 * 1000);
}

export function validateScheduledAt(
  scheduledAt: Date,
  now: Date = new Date(),
): ScheduleValidationResult {
  if (Number.isNaN(scheduledAt.getTime())) {
    return {
      ok: false,
      minScheduledAt: getMinimumScheduledAt(now),
      message: "Invalid scheduled date",
    };
  }

  const minScheduledAt = getMinimumScheduledAt(now);
  if (scheduledAt.getTime() < minScheduledAt.getTime()) {
    return {
      ok: false,
      minScheduledAt,
      message: `Scheduled time must be at least ${MIN_SCHEDULE_LEAD_MINUTES} minutes in the future.`,
    };
  }

  return { ok: true };
}

export function roundToNextMinute(date: Date): Date {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);

  if (date.getSeconds() > 0 || date.getMilliseconds() > 0) {
    rounded.setMinutes(rounded.getMinutes() + 1);
  }

  return rounded;
}
