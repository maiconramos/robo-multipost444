"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useUploadMedia } from "@/hooks";
import { useI18n } from "@/lib/i18n/use-i18n";
import type {
  InstagramPlatformData,
  PlatformMediaReference,
  PlatformSpecificData,
} from "@/lib/platforms/types";
import type { SettingsProviderProps } from "@/components/compose/settings/registry";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ImagePlus, Link2, Loader2, Trash2 } from "lucide-react";

type InstagramPostType = InstagramPlatformData["postType"];

function readInstagramSettings(
  value: PlatformSpecificData | undefined,
): Partial<InstagramPlatformData> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const parsed = value as Record<string, unknown>;
  const postType =
    parsed.postType === "feed" ||
    parsed.postType === "reel" ||
    parsed.postType === "story"
      ? parsed.postType
      : undefined;

  const reelShareToFeed =
    typeof parsed.reelShareToFeed === "boolean"
      ? parsed.reelShareToFeed
      : undefined;

  const reelFeedThumbnail =
    parsed.reelFeedThumbnail &&
    typeof parsed.reelFeedThumbnail === "object" &&
    !Array.isArray(parsed.reelFeedThumbnail) &&
    typeof (parsed.reelFeedThumbnail as Record<string, unknown>).url === "string"
      ? (parsed.reelFeedThumbnail as PlatformMediaReference)
      : undefined;

  return {
    postType,
    reelShareToFeed,
    reelFeedThumbnail,
  };
}

export function InstagramSettings({
  media,
  value,
  onChange,
  errors,
  storageProvider,
}: SettingsProviderProps) {
  const { t } = useI18n();
  const uploadMediaMutation = useUploadMedia();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState("");

  const settings = useMemo(() => readInstagramSettings(value), [value]);
  const mediaType = media[0]?.type;
  const postType: InstagramPostType =
    settings.postType ?? (mediaType === "video" ? "reel" : "feed");

  const canUseFeed = mediaType !== "video";
  const canUseReel = mediaType !== "image";
  const reelShareToFeed = settings.reelShareToFeed ?? true;

  const updateSettings = (next: InstagramPlatformData) => {
    onChange(next as PlatformSpecificData);
  };

  const handlePostTypeChange = (nextPostType: InstagramPostType) => {
    const next: InstagramPlatformData = {
      postType: nextPostType,
    };

    if (nextPostType === "reel") {
      next.reelShareToFeed = reelShareToFeed;
      if (settings.reelFeedThumbnail) {
        next.reelFeedThumbnail = settings.reelFeedThumbnail;
      }
    }

    updateSettings(next);
  };

  const handleReelShareToFeedChange = (checked: boolean) => {
    const next: InstagramPlatformData = {
      postType: "reel",
      reelShareToFeed: checked,
    };

    if (settings.reelFeedThumbnail) {
      next.reelFeedThumbnail = settings.reelFeedThumbnail;
    }

    updateSettings(next);
  };

  const handleThumbnailUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error(t("Instagram reel thumbnail must be an image"));
      return;
    }

    if (storageProvider === "URL_ONLY") {
      toast.error(t("URL-only storage is enabled. Add thumbnail URL manually."));
      return;
    }

    try {
      const uploaded = await uploadMediaMutation.mutateAsync(file);
      if (uploaded.type !== "image") {
        toast.error(t("Instagram reel thumbnail must be an image"));
        return;
      }

      updateSettings({
        postType: "reel",
        reelShareToFeed,
        reelFeedThumbnail: {
          url: uploaded.url,
          key: uploaded.key,
          provider: uploaded.provider,
          filename: uploaded.filename,
          contentType: uploaded.contentType,
          size: uploaded.size,
        },
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? t(error.message)
          : t("Failed to upload thumbnail"),
      );
    }
  };

  const handleThumbnailUrlAdd = () => {
    const valueToAdd = thumbnailUrl.trim();
    if (!valueToAdd) {
      return;
    }

    try {
      const parsedUrl = new URL(valueToAdd);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        throw new Error("Invalid protocol");
      }

      updateSettings({
        postType: "reel",
        reelShareToFeed,
        reelFeedThumbnail: {
          url: parsedUrl.toString(),
          provider: "URL_ONLY",
        },
      });

      setThumbnailUrl("");
    } catch {
      toast.error(t("Please enter a valid image URL"));
    }
  };

  const removeThumbnail = () => {
    updateSettings({
      postType: "reel",
      reelShareToFeed,
      reelFeedThumbnail: undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t("Instagram post type")}</Label>
        <Select
          value={postType}
          onValueChange={(next) =>
            handlePostTypeChange(next as InstagramPostType)
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("Select post type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="feed" disabled={!canUseFeed}>
              {t("Feed")}
            </SelectItem>
            <SelectItem value="reel" disabled={!canUseReel}>
              {t("Reel")}
            </SelectItem>
            <SelectItem value="story">{t("Story")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {postType === "reel" ? (
        <div className="space-y-4 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label>{t("Share reel to feed")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("When enabled, the reel also appears on your Instagram feed")}
              </p>
            </div>
            <Switch
              checked={reelShareToFeed}
              onCheckedChange={handleReelShareToFeedChange}
            />
          </div>

          {reelShareToFeed ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label>{t("Reel feed thumbnail")}</Label>
                {settings.reelFeedThumbnail ? (
                  <Badge variant="secondary">{t("Configured")}</Badge>
                ) : (
                  <Badge variant="outline">{t("Optional")}</Badge>
                )}
              </div>

              {storageProvider !== "URL_ONLY" ? (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleThumbnailUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadMediaMutation.isPending}
                  >
                    {uploadMediaMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="mr-2 h-4 w-4" />
                    )}
                    {t("Upload reel thumbnail")}
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t("URL-only storage is enabled. Add thumbnail URL manually.")}
                </p>
              )}

              <div className="space-y-2">
                <Label>{t("Thumbnail URL")}</Label>
                <div className="flex gap-2">
                  <Input
                    value={thumbnailUrl}
                    onChange={(event) => setThumbnailUrl(event.target.value)}
                    placeholder={t("Example thumbnail URL")}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleThumbnailUrlAdd();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleThumbnailUrlAdd}
                    disabled={!thumbnailUrl.trim()}
                  >
                    <Link2 className="mr-2 h-4 w-4" />
                    {t("Add URL")}
                  </Button>
                </div>
              </div>

              {settings.reelFeedThumbnail ? (
                <div className="rounded-md border border-border p-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-xs text-muted-foreground">
                      {settings.reelFeedThumbnail.url}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={removeThumbnail}
                      aria-label={t("Remove thumbnail")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {errors.length > 0 ? (
        <div className="space-y-1">
          {errors.map((error, index) => (
            <p key={`${error}-${index}`} className="text-xs text-destructive">
              {t(error)}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
