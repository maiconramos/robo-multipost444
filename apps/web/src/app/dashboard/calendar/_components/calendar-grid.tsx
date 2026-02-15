"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns/format";
import { startOfMonth } from "date-fns/startOfMonth";
import { endOfMonth } from "date-fns/endOfMonth";
import { startOfWeek } from "date-fns/startOfWeek";
import { endOfWeek } from "date-fns/endOfWeek";
import { eachDayOfInterval } from "date-fns/eachDayOfInterval";
import { isSameMonth } from "date-fns/isSameMonth";
import { parseISO } from "date-fns/parseISO";
import { isToday } from "date-fns/isToday";
import {
  getPostStatusTone,
  getSemanticToneCalendarItemClassName,
  type PostUiStatus,
} from "@/lib/design-system/status";
import { useI18n } from "@/lib/i18n/use-i18n";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Post {
  _id: string;
  content: string;
  scheduledFor?: string;
  status: PostUiStatus;
  platforms: Array<{ platform: string }>;
  mediaItems?: Array<{ type: "image" | "video"; url: string }>;
}

const getStatusStyles = (status: PostUiStatus) => {
  const tone = getPostStatusTone(status);
  return getSemanticToneCalendarItemClassName(tone);
};

const isWeekend = (date: Date) => [0, 6].includes(date.getDay());

interface CalendarGridProps {
  currentDate: Date;
  posts: Post[];
  onPostClick: (postId: string) => void;
  onDayClick: (date: Date) => void;
}

export function CalendarGrid({
  currentDate,
  posts,
  onPostClick,
  onDayClick,
}: CalendarGridProps) {
  const { t, locale } = useI18n();
  const [expandedDayKey, setExpandedDayKey] = useState<string | null>(null);
  const days = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentDate]);

  const postsByDate = useMemo(() => {
    const map = new Map<string, Post[]>();
    posts.forEach((post) => {
      if (post.scheduledFor) {
        const dateKey = format(parseISO(post.scheduledFor), "yyyy-MM-dd");
        const existing = map.get(dateKey) || [];
        map.set(dateKey, [...existing, post]);
      }
    });
    return map;
  }, [posts]);

  const weekDays =
    locale === "pt-BR"
      ? ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekDaysShort =
    locale === "pt-BR"
      ? ["D", "S", "T", "Q", "Q", "S", "S"]
      : ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="rounded-lg border border-border bg-card overflow-x-auto">
      <div className="min-w-[500px]">
        {/* Week day headers */}
        <div className="grid grid-cols-7 border-b border-border">
          {weekDays.map((day, i) => (
            <div
              key={day}
              className="px-2 py-2 text-center text-xs font-medium text-muted-foreground sm:py-3 sm:text-sm"
            >
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{weekDaysShort[i]}</span>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const dayPosts = postsByDate.get(dateKey) || [];
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={dateKey}
                onClick={() => onDayClick(day)}
                className={cn(
                  "min-h-20 cursor-pointer border-b border-r border-border p-1 transition-colors hover:bg-accent/50 sm:min-h-24",
                  index % 7 === 6 && "border-r-0",
                  index >= days.length - 7 && "border-b-0",
                  !isCurrentMonth && "bg-muted/30",
                  isCurrentMonth && isWeekend(day) && "bg-muted/20 dark:bg-muted/10"
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs sm:h-7 sm:w-7 sm:text-sm",
                      !isCurrentMonth && "text-muted-foreground",
                      isCurrentDay && "bg-primary text-primary-foreground font-medium"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  {dayPosts.length > 0 && (
                    <span className="rounded-full bg-primary/10 px-1 py-0.5 text-[10px] font-medium text-primary sm:px-1.5 sm:text-xs">
                      {dayPosts.length}
                    </span>
                  )}
                </div>

                {/* Post previews */}
                <div className="mt-1 space-y-1">
                  {dayPosts.slice(0, 2).map((post) => (
                    <button
                      key={post._id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPostClick(post._id);
                      }}
                      className={cn(
                        "flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[10px] transition-colors sm:gap-1.5 sm:px-1.5 sm:py-1 sm:text-xs",
                        getStatusStyles(post.status)
                      )}
                    >
                      {post.mediaItems?.[0] && (
                        <img
                          src={post.mediaItems[0].url}
                          alt=""
                          className="h-3 w-3 rounded object-cover flex-shrink-0 sm:h-4 sm:w-4"
                        />
                      )}
                      <span className="flex-1 truncate">{post.content || t("(No content)")}</span>
                    </button>
                  ))}
                  {dayPosts.length > 2 && (
                    <Popover
                      open={expandedDayKey === dateKey}
                      onOpenChange={(isOpen) =>
                        setExpandedDayKey(isOpen ? dateKey : null)
                      }
                    >
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                          className="px-1 text-left text-[10px] text-muted-foreground underline-offset-2 hover:underline sm:text-xs"
                        >
                          {t("+{count} more", { count: dayPosts.length - 2 })}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="start"
                        className="w-72 p-2"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <p className="mb-2 px-1 text-xs font-medium text-muted-foreground">
                          {t("More posts on {date}", {
                            date: format(day, "MMM d"),
                          })}
                        </p>
                        <div className="max-h-60 space-y-1 overflow-y-auto">
                          {dayPosts.slice(2).map((post) => (
                            <button
                              key={`more-${post._id}`}
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setExpandedDayKey(null);
                                onPostClick(post._id);
                              }}
                              className={cn(
                                "flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs transition-colors hover:bg-accent",
                                getStatusStyles(post.status),
                              )}
                            >
                              {post.mediaItems?.[0] ? (
                                <img
                                  src={post.mediaItems[0].url}
                                  alt=""
                                  className="h-5 w-5 rounded object-cover"
                                />
                              ) : null}
                              <span className="truncate">
                                {post.content || t("(No content)")}
                              </span>
                            </button>
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
