"use client";

import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns/format";
import { addMonths } from "date-fns/addMonths";
import { subMonths } from "date-fns/subMonths";
import { startOfMonth } from "date-fns/startOfMonth";
import { endOfMonth } from "date-fns/endOfMonth";
import { useCalendarPosts, useDeletePost } from "@/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { PostCard } from "@/components/posts";
import { CalendarGrid } from "./_components/calendar-grid";
import { CalendarList } from "./_components/calendar-list";
import { CalendarSidebar } from "./_components/calendar-sidebar";
import { ComposeModal } from "@/components/compose/compose-modal";
import { getSemanticToneBadgeClassName } from "@/lib/design-system/status";
import { formatWithLocale } from "@/lib/i18n/date";
import { translateErrorMessage } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/use-i18n";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  Calendar,
  List,
  Grid3X3,
  Menu,
} from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

type ViewMode = "list" | "grid";

export default function CalendarPage() {
  const { t, locale } = useI18n();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  // Compose Modal State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeDate, setComposeDate] = useState<Date | undefined>(undefined);

  // Default to list on mobile, grid on desktop
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    setViewMode(isMobile ? "list" : "grid");
  }, []);

  const deleteMutation = useDeletePost();

  // Fetch posts for the current month (with buffer for edge days)
  const dateFrom = format(subMonths(startOfMonth(currentDate), 1), "yyyy-MM-dd");
  const dateTo = format(addMonths(endOfMonth(currentDate), 1), "yyyy-MM-dd");

  const { data: postsData, isLoading, refetch } = useCalendarPosts(dateFrom, dateTo);
  const posts = useMemo(() => (postsData?.posts || []) as any[], [postsData?.posts]);

  const selectedPost = useMemo(
    () => posts.find((p: any) => p._id === selectedPostId),
    [posts, selectedPostId]
  );

  const handlePrevMonth = () => setCurrentDate((d) => subMonths(d, 1));
  const handleNextMonth = () => setCurrentDate((d) => addMonths(d, 1));
  const handleToday = () => setCurrentDate(new Date());

  const handleDelete = async () => {
    if (!postToDelete) return;
    try {
      await deleteMutation.mutateAsync(postToDelete);
      toast.success(t("Post deleted"));
      setPostToDelete(null);
      setSelectedPostId(null);
    } catch (error) {
      toast.error(translateErrorMessage(error, t, "Failed to delete post"));
    }
  };

  // Stats for the month
  const monthPosts = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    return posts.filter((p: any) => {
      if (!p.scheduledFor) return false;
      const postDate = new Date(p.scheduledFor);
      return postDate >= monthStart && postDate <= monthEnd;
    });
  }, [posts, currentDate]);

  const scheduledCount = useMemo(
    () => monthPosts.filter((p: any) => p.status === "scheduled").length,
    [monthPosts]
  );
  const publishedCount = useMemo(
    () => monthPosts.filter((p: any) => p.status === "published").length,
    [monthPosts]
  );

  const openCompose = (date?: Date) => {
    setComposeDate(date);
    setIsComposeOpen(true);
  };

  return (
    <div className="flex flex-col gap-8 lg:flex-row items-start">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:block sticky top-20 w-72 flex-shrink-0">
        <CalendarSidebar onCreatePost={() => openCompose()} />
      </aside>

      <div className="flex-1 space-y-4 sm:space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{t("Calendar")}</h1>
            <p className="text-muted-foreground">
              {t("View and manage your scheduled posts.")}
            </p>
          </div>

          {/* Mobile Sidebar Trigger */}
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                <div className="mt-6">
                  <CalendarSidebar onCreatePost={() => {
                    // Close sheet logic would be here but sheet closes on click usually if configured
                    openCompose();
                  }} />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Month Navigation */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <h2 className="min-w-32 text-center text-base font-semibold sm:min-w-36">
                  {formatWithLocale(currentDate, "MMMM yyyy", locale)}
                </h2>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" className="hidden h-8 sm:inline-flex" onClick={handleToday}>
                  {t("Today")}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {/* View toggle */}
                <div className="flex rounded-lg border border-border p-0.5">
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Stats badges - hidden on mobile */}
                <Badge
                  variant="outline"
                  className={cn(
                    "hidden border text-xs sm:inline-flex",
                    getSemanticToneBadgeClassName("info"),
                  )}
                >
                  {t("{count} scheduled", { count: scheduledCount })}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "hidden border text-xs sm:inline-flex",
                    getSemanticToneBadgeClassName("success"),
                  )}
                >
                  {t("{count} published", { count: publishedCount })}
                </Badge>

                {/* Mobile Create Button */}
                <Button size="sm" className="h-8 lg:hidden" onClick={() => openCompose()}>
                  <Plus className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">{t("New Post")}</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Content */}
        <Card className="flex-1 overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              {viewMode === "grid" ? (
                <Calendar className="h-4 w-4" />
              ) : (
                <List className="h-4 w-4" />
              )}
              {t("{month} Schedule", {
                month: formatWithLocale(currentDate, "MMMM", locale),
              })}
            </CardTitle>
            <CardDescription>
              {viewMode === "grid"
                ? t("Click on a post to view details or a day to create a new post.")
                : t("Tap a post to view details.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              viewMode === "grid" ? <CalendarSkeleton /> : <ListSkeleton />
            ) : viewMode === "grid" ? (
              <CalendarGrid
                currentDate={currentDate}
                posts={posts}
                onPostClick={setSelectedPostId}
                onDayClick={(date) => {
                  openCompose(date);
                }}
              />
            ) : (
              <CalendarList
                currentDate={currentDate}
                posts={posts}
                onPostClick={setSelectedPostId}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Post detail dialog */}
      <Dialog
        open={!!selectedPostId}
        onOpenChange={() => setSelectedPostId(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("Post Details")}</DialogTitle>
          </DialogHeader>
          {selectedPost && (
            <PostCard
              post={selectedPost}
              onEdit={(_id) => {
                setSelectedPostId(null);
                // Ideally this would open compose in edit mode, but for now just close
              }}
              onDelete={(id) => {
                setPostToDelete(id);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Compose Modal */}
      <ComposeModal
        open={isComposeOpen}
        onOpenChange={setIsComposeOpen}
        initialDate={composeDate}
        onSuccess={() => {
          refetch(); // Refresh posts after creation
        }}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!postToDelete} onOpenChange={() => setPostToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete Post")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("Are you sure you want to delete this post? This action cannot be undone.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CalendarSkeleton() {
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weekDaysPT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  const lang = typeof document !== "undefined" ? document.documentElement.lang : "pt-BR";
  const labels = lang === "en" ? weekDays : weekDaysPT;

  return (
    <div className="animate-pulse">
      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {labels.map((day) => (
          <div
            key={day}
            className="px-2 py-3 text-center text-sm font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid skeleton - 5 rows of 7 days */}
      <div className="grid grid-cols-7">
        {Array.from({ length: 35 }).map((_, index) => (
          <div
            key={index}
            className={`min-h-24 border-b border-r border-border p-1 ${index % 7 === 6 ? "border-r-0" : ""
              } ${index >= 28 ? "border-b-0" : ""}`}
          >
            <div className="flex items-center justify-between">
              <div className="h-7 w-7 rounded-full bg-muted" />
            </div>
            {index % 3 === 0 && (
              <div className="mt-1 space-y-1">
                <div className="h-5 w-full rounded bg-muted" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="animate-pulse divide-y divide-border">
      {[1, 2, 3].map((group) => (
        <div key={group}>
          {/* Day header skeleton */}
          <div className="bg-muted/50 px-4 py-2">
            <div className="h-4 w-32 rounded bg-muted" />
          </div>
          {/* Posts skeleton */}
          {[1, 2].map((post) => (
            <div key={post} className="flex gap-3 p-4">
              <div className="h-14 w-14 shrink-0 rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
