"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useAccounts, useAccountsHealth, usePosts, useDraftPosts, useApprovePost, useQueuePreview } from "@/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AccountAvatar } from "@/components/accounts";
import { PlatformIcons } from "@/components/posts";
import { StatusBadge } from "@/components/shared";
import {
  getSemanticToneSurfaceClassName,
  getSemanticToneTextClassName,
} from "@/lib/design-system/status";
import { PLATFORM_NAMES, type Platform } from "@/lib/platforms/types";
import { parseISO } from "date-fns/parseISO";
import { formatWithLocale } from "@/lib/i18n/date";
import { useI18n } from "@/lib/i18n/use-i18n";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { translateErrorMessage } from "@/lib/i18n";
import {
  LayoutDashboard,
  Clock,
  Users,
  ListOrdered,
  CheckCircle2,
  AlertCircle,
  FileText,
  Loader2,
} from "lucide-react";

export default function DashboardPage() {
  const { t, locale } = useI18n();
  const { data: accountsData, isLoading: accountsLoading } = useAccounts();
  const { data: healthData } = useAccountsHealth();
  const { data: postsData, isLoading: postsLoading } = usePosts({ limit: 10 });
  const { data: draftsData, isLoading: draftsLoading } = useDraftPosts(10);
  const approvePostMutation = useApprovePost();
  const { data: queueData } = useQueuePreview(5);

  const accounts = accountsData?.accounts || [];
  const posts = useMemo(() => postsData?.posts || [], [postsData?.posts]);
  const accountsNeedingAttention = (healthData?.accounts || []).filter(
    (a: any) => a.status === "needs_reconnect"
  ).length;
  const drafts = useMemo(() => draftsData?.posts || [], [draftsData?.posts]);
  const upcomingSlots = queueData?.slots || [];
  const neutralToneClassName = getSemanticToneTextClassName("neutral");
  const infoToneClassName = getSemanticToneTextClassName("info");
  const successToneClassName = getSemanticToneTextClassName("success");
  const dangerToneClassName = getSemanticToneTextClassName("danger");
  const warningSurfaceClassName = getSemanticToneSurfaceClassName("warning");

  const { scheduledPosts, publishedPosts, failedPosts } = useMemo(() => ({
    scheduledPosts: posts.filter((p: any) => p.status === "scheduled"),
    publishedPosts: posts.filter((p: any) => p.status === "published"),
    failedPosts: posts.filter((p: any) => p.status === "failed"),
  }), [posts]);

  return (
    <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">{t("Dashboard")}</h1>
        <p className="text-muted-foreground">
          {t("Welcome back! Here's your overview.")}
        </p>
      </div>

      {/* Account health warning */}
      {accountsNeedingAttention > 0 && (
        <Link
          href="/dashboard/accounts"
          className={cn(
            "flex items-center gap-3 rounded-lg border p-3 transition-[filter] hover:brightness-95",
            warningSurfaceClassName,
          )}
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">
              {accountsNeedingAttention}{" "}
              {accountsNeedingAttention === 1 ? t("account needs") : t("accounts need")}{" "}
              {t("reconnection")}
            </p>
            <p className="text-xs opacity-80">
              {t("Click to review and fix connection issues")}
            </p>
          </div>
        </Link>
      )}

      {/* Overview Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LayoutDashboard className="h-4 w-4" />
            {t("Overview")}
          </CardTitle>
          <CardDescription>
            {t("Your account and posting statistics.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted p-4">
            {accountsLoading || postsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-2xl font-semibold">{accounts.length}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{t("Accounts")}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <FileText className={cn("h-4 w-4", neutralToneClassName)} />
                    <span className={cn("text-2xl font-semibold", neutralToneClassName)}>
                      {drafts.length}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{t("Drafts")}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className={cn("h-4 w-4", infoToneClassName)} />
                    <span className={cn("text-2xl font-semibold", infoToneClassName)}>
                      {scheduledPosts.length}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{t("Scheduled")}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle2 className={cn("h-4 w-4", successToneClassName)} />
                    <span className={cn("text-2xl font-semibold", successToneClassName)}>
                      {publishedPosts.length}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{t("Published")}</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <AlertCircle className={cn("h-4 w-4", dangerToneClassName)} />
                    <span className={cn("text-2xl font-semibold", dangerToneClassName)}>
                      {failedPosts.length}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{t("Failed")}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              {t("Recent Posts")}
            </CardTitle>
            <CardDescription>
              {t("Your latest posts and their status.")}
            </CardDescription>
          </div>
          {posts.length > 0 && (
            <Button variant="ghost" size="sm" className="text-xs" asChild>
              <Link href="/dashboard/calendar">{t("View all")}</Link>
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {postsLoading ? (
            <LoadingSkeleton rows={5} />
          ) : posts.length === 0 ? (
            <EmptyState
              message={t("No posts yet")}
              action={t("Create your first post")}
              href="/dashboard/compose"
            />
          ) : (
            posts.slice(0, 5).map((post: any) => (
              <div
                key={post._id}
                className="flex items-center justify-between rounded-lg bg-muted p-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {post.mediaItems?.[0] && (
                    <img
                      src={post.mediaItems[0].url}
                      alt=""
                      className="h-10 w-10 rounded object-cover flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {post.content || t("(No content)")}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <PlatformIcons platforms={post.platforms || []} size="xs" />
                      {post.scheduledFor && (
                        <span className="text-xs text-muted-foreground">
                          {formatWithLocale(parseISO(post.scheduledFor), "MMM d, h:mm a", locale)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <StatusBadge status={post.status} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Drafts Pending Approval */}
      {drafts.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                {t("Drafts")}
              </CardTitle>
              <CardDescription>
                {t("Posts waiting for approval before publishing.")}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {draftsLoading ? (
              <LoadingSkeleton rows={3} />
            ) : (
              drafts.slice(0, 5).map((draft: any) => (
                <div
                  key={draft._id}
                  className="flex items-center justify-between rounded-lg bg-muted p-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {draft.mediaItems?.[0] && (
                      <img
                        src={draft.mediaItems[0].url}
                        alt=""
                        className="h-10 w-10 rounded object-cover flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {draft.content || t("(No content)")}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <PlatformIcons platforms={draft.platforms || []} size="xs" />
                        {draft.scheduledFor && (
                          <span className="text-xs text-muted-foreground">
                            {t("Planned")}: {formatWithLocale(parseISO(draft.scheduledFor), "MMM d, h:mm a", locale)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={draft.status} />
                    {draft.scheduledFor && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={approvePostMutation.isPending}
                        onClick={() => {
                          approvePostMutation.mutate(
                            { postId: draft._id },
                            {
                              onSuccess: () => {
                                toast.success(t("Post approved and scheduled!"));
                              },
                              onError: (error) => {
                                toast.error(
                                  translateErrorMessage(error, t, "Failed to approve post"),
                                );
                              },
                            },
                          );
                        }}
                      >
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        {t("Approve")}
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Connected Accounts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              {t("Accounts")}
            </CardTitle>
            <CardDescription>
              {t("Your connected social media accounts.")}
            </CardDescription>
          </div>
          {accounts.length > 0 && (
            <Button variant="ghost" size="sm" className="text-xs" asChild>
              <Link href="/dashboard/accounts">{t("View all")}</Link>
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {accountsLoading ? (
            <LoadingSkeleton rows={3} />
          ) : accounts.length === 0 ? (
            <EmptyState
              message={t("No accounts connected")}
              action={t("Connect an account")}
              href="/dashboard/accounts"
            />
          ) : (
            accounts.slice(0, 5).map((account: any) => (
              <div
                key={account._id}
                className="flex items-center justify-between rounded-lg bg-muted p-3"
              >
                <div className="flex items-center gap-3">
                  <AccountAvatar account={account} size="sm" />
                  <span className="text-sm font-medium">
                    {account.displayName || account.username}
                  </span>
                </div>
                <Badge variant="secondary">
                  {PLATFORM_NAMES[account.platform as Platform]}
                </Badge>
              </div>
            ))
          )}
          {accounts.length > 5 && (
            <p className="text-center text-xs text-muted-foreground">
              {t("+{count} more accounts", { count: accounts.length - 5 })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Queue Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListOrdered className="h-4 w-4" />
            {t("Upcoming Queue")}
          </CardTitle>
          <CardDescription>
            {t("Your next scheduled posting slots.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingSlots.length === 0 ? (
            <EmptyState
              message={t("No queue slots configured")}
              action={t("Set up your queue")}
              href="/dashboard/queue"
            />
          ) : (
            upcomingSlots.slice(0, 5).map((slot: string, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-muted p-3"
              >
                <span className="text-sm">
                  {formatWithLocale(parseISO(slot), "EEEE, MMM d", locale)}
                </span>
                <Badge variant="outline">
                  {formatWithLocale(parseISO(slot), "h:mm a", locale)}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

    </div>
  );
}

function LoadingSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg bg-muted p-3 animate-pulse">
          <div className="h-10 w-10 rounded bg-background" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/4 rounded bg-background" />
            <div className="h-2 w-1/2 rounded bg-background" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message, action, href }: { message: string; action: string; href: string }) {
  return (
    <div className="rounded-lg bg-muted p-6 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="link" size="sm" className="mt-2" asChild>
        <Link href={href}>{action}</Link>
      </Button>
    </div>
  );
}
