"use client";

import { parseISO } from "date-fns/parseISO";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { StatusBadge } from "@/components/shared/status-badge";
import type { PostUiStatus } from "@/lib/design-system/status";
import { formatWithLocale } from "@/lib/i18n/date";
import { useI18n } from "@/lib/i18n/use-i18n";
import type { Platform } from "@/lib/platforms/types";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  RefreshCw,
  Calendar,
  CheckCircle2,
  Image as ImageIcon,
  Video,
  ExternalLink,
} from "lucide-react";

interface Post {
  _id: string;
  content: string;
  mediaItems?: Array<{ type: "image" | "video"; url: string }>;
  platforms: Array<{
    platform: string;
    accountId: string;
    status?: string;
    platformPostUrl?: string;
  }>;
  scheduledFor?: string;
  status: PostUiStatus;
  createdAt: string;
}

interface PostCardProps {
  post: Post;
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  onRetry?: (postId: string) => void;
  onApprove?: (postId: string) => void;
  compact?: boolean;
}

export function PostCard({
  post,
  onEdit,
  onDelete,
  onRetry,
  onApprove,
  compact = false,
}: PostCardProps) {
  const { t, locale } = useI18n();
  const hasMedia = post.mediaItems && post.mediaItems.length > 0;
  const imageCount = post.mediaItems?.filter((m) => m.type === "image").length || 0;
  const videoCount = post.mediaItems?.filter((m) => m.type === "video").length || 0;

  return (
    <div className="rounded-lg bg-muted">
      {/* Media preview for non-compact */}
      {!compact && hasMedia && post.mediaItems?.[0] && (
        <div className="relative aspect-video overflow-hidden rounded-t-lg bg-background">
          {post.mediaItems[0].type === "video" ? (
            <video
              src={post.mediaItems[0].url}
              className="h-full w-full object-cover"
            />
          ) : (
            <img
              src={post.mediaItems[0].url}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
          {post.mediaItems.length > 1 && (
            <div className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
              +{post.mediaItems.length - 1}
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        {/* Content */}
        <p className={`text-sm ${compact ? "line-clamp-2" : "line-clamp-3"}`}>
          {post.content || t("(No content)")}
        </p>

        {/* Media indicators for compact */}
        {compact && hasMedia && (
          <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
            {imageCount > 0 && (
              <span className="flex items-center gap-1">
                <ImageIcon className="h-3 w-3" />
                {imageCount}
              </span>
            )}
            {videoCount > 0 && (
              <span className="flex items-center gap-1">
                <Video className="h-3 w-3" />
                {videoCount}
              </span>
            )}
          </div>
        )}

        {/* Platforms and metadata */}
        <div className="mt-3 flex items-center justify-between">
          <PlatformIcons platforms={post.platforms} />
          <StatusBadge status={post.status} />
        </div>

        {/* Schedule time */}
        {post.scheduledFor && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {post.status === "draft" && (
              <span className="font-medium">{t("Planned")}:</span>
            )}
            {formatWithLocale(
              parseISO(post.scheduledFor),
              locale === "pt-BR" ? "d 'de' MMM yyyy 'às' HH:mm" : "MMM d, yyyy 'at' h:mm a",
              locale,
            )}
          </div>
        )}

        {/* Actions */}
        {(onEdit || onDelete || onRetry || onApprove) && (
          <div className="mt-3 flex items-center justify-end gap-2">
            {post.status === "draft" && onApprove && (
              <Button variant="outline" size="sm" onClick={() => onApprove(post._id)}>
                <CheckCircle2 className="mr-1.5 h-3 w-3" />
                {t("Approve")}
              </Button>
            )}
            {post.status === "failed" && onRetry && (
              <Button variant="outline" size="sm" onClick={() => onRetry(post._id)}>
                <RefreshCw className="mr-1.5 h-3 w-3" />
                {t("Retry")}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label={t("Post actions")}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && post.status !== "published" && (
                  <DropdownMenuItem onClick={() => onEdit(post._id)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    {t("Edit")}
                  </DropdownMenuItem>
                )}
                {post.status === "published" && post.platforms[0]?.platformPostUrl && (
                  <DropdownMenuItem asChild>
                    <a
                      href={post.platforms[0].platformPostUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      {t("View Post")}
                    </a>
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={() => onDelete(post._id)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("Delete")}
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
}

interface PlatformIconsProps {
  platforms: Array<{ platform: string }>;
  max?: number;
  size?: "xs" | "sm";
}

export function PlatformIcons({ platforms, max = 4, size = "sm" }: PlatformIconsProps) {
  const visiblePlatforms = platforms.slice(0, max);
  const remaining = platforms.length - max;

  const containerSize = size === "xs" ? "h-5 w-5" : "h-6 w-6";
  const iconSize = "xs";
  const fontSize = size === "xs" ? "text-[10px]" : "text-xs";

  return (
    <div className="flex -space-x-1">
      {visiblePlatforms.map((p, i) => (
        <div
          key={i}
          className={`flex ${containerSize} items-center justify-center rounded-full border-2 border-muted bg-background`}
        >
          <PlatformIcon
            platform={p.platform as Platform}
            size={iconSize}
            showColor
          />
        </div>
      ))}
      {remaining > 0 && (
        <div className={`flex ${containerSize} items-center justify-center rounded-full border-2 border-muted bg-background ${fontSize} font-medium`}>
          +{remaining}
        </div>
      )}
    </div>
  );
}

interface PostListItemProps {
  post: Post;
  onClick?: () => void;
}

export function PostListItem({ post, onClick }: PostListItemProps) {
  const { t } = useI18n();
  const content = (
    <div className="flex w-full items-start gap-3">
      {post.mediaItems?.[0] && (
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-background">
          {post.mediaItems[0].type === "video" ? (
            <video
              src={post.mediaItems[0].url}
              className="h-full w-full object-cover"
            />
          ) : (
            <img
              src={post.mediaItems[0].url}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        <p className="truncate text-sm">{post.content || t("(No content)")}</p>
        <div className="mt-1 flex items-center gap-2">
          <PlatformIcons platforms={post.platforms} max={3} size="xs" />
          <StatusBadge status={post.status} />
        </div>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left transition-colors hover:opacity-80"
      >
        {content}
      </button>
    );
  }

  return content;
}
