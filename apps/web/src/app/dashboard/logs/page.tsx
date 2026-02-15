"use client";

import { useMemo, useState } from "react";
import { parseISO } from "date-fns/parseISO";
import { usePublishingLogs, type PublishingLogStatus } from "@/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/use-i18n";
import { formatWithLocale } from "@/lib/i18n/date";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  Filter
} from "lucide-react";
import { cn } from "@/lib/utils";

const statusOptions: Array<PublishingLogStatus> = [
  "draft",
  "scheduled",
  "publishing",
  "published",
  "failed",
];

const StatusBadge = ({ status }: { status: string }) => {
  const { t } = useI18n();

  const styles = {
    published: "bg-status-success-bg text-status-success-fg border-status-success-border",
    failed: "bg-status-danger-bg text-status-danger-fg border-status-danger-border",
    publishing: "bg-status-info-bg text-status-info-fg border-status-info-border",
    scheduled: "bg-status-warning-bg text-status-warning-fg border-status-warning-border",
    draft: "bg-status-neutral-bg text-status-neutral-fg border-status-neutral-border",
  };

  const icons = {
    published: <CheckCircle2 className="mr-1 h-3 w-3" />,
    failed: <AlertTriangle className="mr-1 h-3 w-3" />,
    publishing: <Loader2 className="mr-1 h-3 w-3 animate-spin" />,
    scheduled: <Clock className="mr-1 h-3 w-3" />,
    draft: null,
  };

  const style = styles[status as keyof typeof styles] || styles.draft;
  const icon = icons[status as keyof typeof icons] || null;

  return (
    <Badge variant="outline" className={cn("capitalize font-medium", style)}>
      {icon}
      {t(status)}
    </Badge>
  );
};

export default function LogsPage() {
  const { t, locale } = useI18n();
  const [postIdFilter, setPostIdFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<PublishingLogStatus | "all">("all");
  const [dateFromFilter, setDateFromFilter] = useState("");
  const [dateToFilter, setDateToFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;

  const filters = useMemo(
    () => ({
      postId: postIdFilter.trim() || undefined,
      status: statusFilter === "all" ? undefined : statusFilter,
      dateFrom: dateFromFilter || undefined,
      dateTo: dateToFilter || undefined,
      page,
      limit,
    }),
    [dateFromFilter, dateToFilter, page, postIdFilter, statusFilter],
  );

  const { data, isLoading, isFetching, refetch } = usePublishingLogs(filters);

  const entries = data?.entries || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("Publishing Logs")}</h1>
          <p className="text-muted-foreground">
            {t("Monitor publication attempts and diagnose issues.")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPage(1);
              void refetch();
            }}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {t("Refresh")}
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex flex-col gap-4 border-b p-4 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("Filter by Post ID...")}
              value={postIdFilter}
              onChange={(e) => {
                setPage(1);
                setPostIdFilter(e.target.value);
              }}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setPage(1);
                setStatusFilter(value as PublishingLogStatus | "all");
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder={t("Status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("All statuses")}</SelectItem>
                {statusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {t(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="date"
              value={dateFromFilter}
              onChange={(e) => {
                setPage(1);
                setDateFromFilter(e.target.value);
              }}
              className="w-auto"
            />
            <Input
              type="date"
              value={dateToFilter}
              onChange={(e) => {
                setPage(1);
                setDateToFilter(e.target.value);
              }}
              className="w-auto"
            />

            {(postIdFilter || statusFilter !== "all" || dateFromFilter || dateToFilter) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setPostIdFilter("");
                  setStatusFilter("all");
                  setDateFromFilter("");
                  setDateToFilter("");
                  setPage(1);
                }}
                className="shrink-0"
              >
                <Filter className="h-4 w-4" />
                <span className="sr-only">{t("Clear filters")}</span>
              </Button>
            )}
          </div>
        </div>

        <div className="relative">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center text-muted-foreground">
              <p>{t("No logs found matching your criteria")}</p>
            </div>
          ) : (
            <div className="divide-y">
              {entries.map((entry) => (
                <div
                  key={entry.post.id}
                  className="group flex flex-col gap-4 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-start"
                >
                  {/* Status Indicator Bar */}
                  <div className={cn(
                    "hidden w-1 self-stretch rounded-full sm:block",
                    entry.post.status === 'published' ? "bg-success" :
                      entry.post.status === 'failed' ? "bg-destructive" :
                        "bg-border"
                  )} />

                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">#{entry.post.id.slice(-8)}</span>
                          <StatusBadge status={entry.post.status} />
                          <span className="text-xs text-muted-foreground">
                            {formatWithLocale(parseISO(entry.post.updatedAt), "dd/MM/yyyy HH:mm", locale)}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-sm font-medium">
                          {entry.post.content || <span className="italic text-muted-foreground">{t("No text content")}</span>}
                        </p>
                      </div>
                    </div>

                    {/* Platform statuses grid */}
                    <div className="grid gap-2 border-t pt-2 sm:grid-cols-2 lg:grid-cols-3">
                      {entry.platformPosts.map((platformPost) => (
                        <div
                          key={platformPost.id}
                          className="flex flex-col gap-2 rounded-md border bg-card p-2 text-xs shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <Badge variant="secondary" className="shrink-0 text-[10px]">
                                {platformPost.platform}
                              </Badge>
                              <span className="truncate text-muted-foreground" title={platformPost.accountName || platformPost.accountHandle}>
                                {platformPost.accountName || platformPost.accountHandle}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <StatusBadge status={platformPost.status} />
                              {platformPost.platformPostUrl && (
                                <a
                                  href={platformPost.platformPostUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-muted-foreground hover:text-primary"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>

                          {platformPost.errorMessage && (
                            <div className="mt-1 rounded bg-destructive/10 p-2 text-[10px] text-destructive break-words">
                              {platformPost.errorMessage}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Cron Job Info if available */}
                    {entry.cronJob && entry.cronJob.status === "failed" && (
                      <div className="flex items-center gap-2 text-xs text-destructive">
                        <AlertTriangle className="h-3 w-3" />
                        <span>{t("System Error")}: {entry.cronJob.lastError}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t p-4">
            <p className="text-xs text-muted-foreground">
              {t("Page {page} of {pages}", {
                page: pagination.page,
                pages: pagination.totalPages,
              })}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={pagination.page <= 1 || isFetching}
              >
                {t("Previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setPage((current) => Math.min(pagination.totalPages, current + 1))
                }
                disabled={pagination.page >= pagination.totalPages || isFetching}
              >
                {t("Next")}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
