"use client";

import { format } from "date-fns/format";
import { toZonedTime, format as formatTz } from "date-fns-tz";
import { useAppStore } from "@/stores";
import { useNextQueueSlot } from "@/hooks";
import { getDateFnsLocale } from "@/lib/i18n/date";
import { useI18n } from "@/lib/i18n/use-i18n";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MIN_SCHEDULE_LEAD_MINUTES } from "@/lib/posts/scheduling";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Clock, FileText, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export type ScheduleType = "now" | "scheduled" | "queue" | "draft";

interface SchedulePickerProps {
  scheduleType: ScheduleType;
  scheduledDate: Date | undefined;
  scheduledTime: string;
  onScheduleTypeChange: (type: ScheduleType) => void;
  onDateChange: (date: Date | undefined) => void;
  onTimeChange: (time: string) => void;
}

export function SchedulePicker({
  scheduleType,
  scheduledDate,
  scheduledTime,
  onScheduleTypeChange,
  onDateChange,
  onTimeChange,
}: SchedulePickerProps) {
  const { t, locale } = useI18n();
  const { timezone } = useAppStore();
  const { data: nextSlotData } = useNextQueueSlot();

  const scheduleOptions = [
    {
      value: "now" as const,
      label: t("Publish Now"),
      icon: Zap,
      description: t("Post immediately"),
    },
    {
      value: "scheduled" as const,
      label: t("Schedule"),
      icon: CalendarIcon,
      description: t("Pick a specific date and time"),
    },
    {
      value: "queue" as const,
      label: t("Add to Queue"),
      icon: Clock,
      description: nextSlotData?.nextSlot
        ? t("Next slot: {slot}", {
            slot: formatTz(
              toZonedTime(new Date(nextSlotData.nextSlot), timezone),
              "MMM d, h:mm a",
              {
                timeZone: timezone,
                locale: getDateFnsLocale(locale),
              },
            ),
          })
        : t("Uses your queue schedule"),
    },
    {
      value: "draft" as const,
      label: t("Save as Draft"),
      icon: FileText,
      description: t("Save and schedule later after approval"),
    },
  ];
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-4">
      {/* Schedule type selection */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {scheduleOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onScheduleTypeChange(option.value)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors",
              scheduleType === option.value
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-accent"
            )}
          >
            <option.icon className="h-5 w-5" />
            <span className="text-sm font-medium">{option.label}</span>
          </button>
        ))}
      </div>

      {/* Schedule description */}
      <p className="text-sm text-muted-foreground">
        {scheduleOptions.find((o) => o.value === scheduleType)?.description}
      </p>

      {/* Quick select options for scheduled/draft posts */}
      {(scheduleType === "scheduled" || scheduleType === "draft") && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() + 1);
              d.setHours(9, 0, 0, 0);
              onDateChange(d);
              onTimeChange("09:00");
            }}
          >
            {t("Tomorrow 9 AM")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => {
              const d = new Date();
              d.setDate(d.getDate() + 1);
              d.setHours(18, 0, 0, 0);
              onDateChange(d);
              onTimeChange("18:00");
            }}
          >
            {t("Tomorrow 6 PM")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => {
              const d = new Date();
              const daysUntilMonday = (8 - d.getDay()) % 7 || 7;
              d.setDate(d.getDate() + daysUntilMonday);
              d.setHours(10, 0, 0, 0);
              onDateChange(d);
              onTimeChange("10:00");
            }}
          >
            {t("Next Monday")}
          </Button>
        </div>
      )}

      {/* Date/time picker for scheduled/draft posts */}
      {(scheduleType === "scheduled" || scheduleType === "draft") && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>{scheduleType === "draft" ? t("Planned date (optional)") : t("Date")}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !scheduledDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {scheduledDate
                    ? format(scheduledDate, "PPP", { locale: getDateFnsLocale(locale) })
                    : t("Pick a date")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={scheduledDate}
                  onSelect={onDateChange}
                  disabled={(date) => date < startOfToday}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>{t("Time")}</Label>
            <Input
              type="time"
              value={scheduledTime}
              onChange={(e) => onTimeChange(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Timezone info */}
      {(scheduleType === "scheduled" || scheduleType === "draft") && (
        <p className="text-xs text-muted-foreground">
          {t("Timezone")}: {timezone}
        </p>
      )}

      {scheduleType === "scheduled" && (
        <p className="text-xs text-muted-foreground">
          {t("Scheduled time must be at least {minutes} minutes in the future.", {
            minutes: MIN_SCHEDULE_LEAD_MINUTES,
          })}
        </p>
      )}

      {scheduleType === "draft" && (
        <p className="text-xs text-muted-foreground">
          {t("Draft will need approval before publishing.")}
        </p>
      )}
    </div>
  );
}
