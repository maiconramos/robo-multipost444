"use client";

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useUploadMedia } from "@/hooks";
import { useI18n } from "@/lib/i18n/use-i18n";
import type {
  PlatformMediaReference,
  PlatformSpecificData,
  YouTubePlatformData,
} from "@/lib/platforms/types";
import type { SettingsProviderProps } from "@/components/compose/settings/registry";
import { Badge } from "@/components/ui/badge";
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
import { ImagePlus, Link2, Loader2, Plus, Trash2, X } from "lucide-react";

function readYouTubeSettings(
  value: PlatformSpecificData | undefined,
): Partial<YouTubePlatformData> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const parsed = value as Record<string, unknown>;

  const visibility =
    parsed.visibility === "public" ||
    parsed.visibility === "private" ||
    parsed.visibility === "unlisted"
      ? parsed.visibility
      : undefined;

  const tags = Array.isArray(parsed.tags)
    ? parsed.tags
        .filter((tag): tag is string => typeof tag === "string")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : undefined;

  const thumbnail =
    parsed.thumbnail &&
    typeof parsed.thumbnail === "object" &&
    !Array.isArray(parsed.thumbnail) &&
    typeof (parsed.thumbnail as Record<string, unknown>).url === "string"
      ? (parsed.thumbnail as PlatformMediaReference)
      : undefined;

  return {
    title: typeof parsed.title === "string" ? parsed.title : undefined,
    visibility,
    madeForKids:
      typeof parsed.madeForKids === "boolean"
        ? parsed.madeForKids
        : undefined,
    tags,
    thumbnail,
  };
}

export function YouTubeSettings({
  media,
  value,
  onChange,
  errors,
  storageProvider,
}: SettingsProviderProps) {
  const { t } = useI18n();
  const uploadMediaMutation = useUploadMedia();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tagInput, setTagInput] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");

  const settings = useMemo(() => readYouTubeSettings(value), [value]);

  const title = settings.title ?? "";
  const visibility = settings.visibility ?? "private";
  const madeForKids = settings.madeForKids ?? false;
  const tags = settings.tags ?? [];

  const updateSettings = (next: YouTubePlatformData) => {
    onChange(next as PlatformSpecificData);
  };

  const buildNextSettings = (
    partial: Partial<YouTubePlatformData>,
  ): YouTubePlatformData => ({
    title,
    visibility,
    madeForKids,
    tags,
    ...(settings.thumbnail ? { thumbnail: settings.thumbnail } : {}),
    ...partial,
  });

  const addTag = () => {
    const normalized = tagInput.trim();
    if (!normalized) {
      return;
    }

    if (tags.includes(normalized)) {
      setTagInput("");
      return;
    }

    if (tags.length >= 50) {
      toast.error(t("You can add up to 50 tags"));
      return;
    }

    updateSettings(buildNextSettings({ tags: [...tags, normalized] }));
    setTagInput("");
  };

  const removeTag = (tag: string) => {
    updateSettings(buildNextSettings({ tags: tags.filter((item) => item !== tag) }));
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
      toast.error(t("YouTube thumbnail must be an image"));
      return;
    }

    if (storageProvider === "URL_ONLY") {
      toast.error(t("URL-only storage is enabled. Add thumbnail URL manually."));
      return;
    }

    try {
      const uploaded = await uploadMediaMutation.mutateAsync(file);
      if (uploaded.type !== "image") {
        toast.error(t("YouTube thumbnail must be an image"));
        return;
      }

      updateSettings(
        buildNextSettings({
          thumbnail: {
            url: uploaded.url,
            key: uploaded.key,
            provider: uploaded.provider,
            filename: uploaded.filename,
            contentType: uploaded.contentType,
            size: uploaded.size,
          },
        }),
      );
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

      updateSettings(
        buildNextSettings({
          thumbnail: {
            url: parsedUrl.toString(),
            provider: "URL_ONLY",
          },
        }),
      );
      setThumbnailUrl("");
    } catch {
      toast.error(t("Please enter a valid image URL"));
    }
  };

  const removeThumbnail = () => {
    updateSettings(buildNextSettings({ thumbnail: undefined }));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="youtube-title">{t("YouTube title")}</Label>
        <Input
          id="youtube-title"
          value={title}
          onChange={(event) =>
            updateSettings(buildNextSettings({ title: event.target.value }))
          }
          placeholder={t("Enter a title between 2 and 100 characters")}
          maxLength={100}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("Visibility")}</Label>
          <Select
            value={visibility}
            onValueChange={(next) =>
              updateSettings(
                buildNextSettings({
                  visibility: next as YouTubePlatformData["visibility"],
                }),
              )
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("Select visibility")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">{t("Public")}</SelectItem>
              <SelectItem value="unlisted">{t("Unlisted")}</SelectItem>
              <SelectItem value="private">{t("Private")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 rounded-md border border-border p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label>{t("Made for kids")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("Indicate if this content is made for children")}
              </p>
            </div>
            <Switch
              checked={madeForKids}
              onCheckedChange={(checked) =>
                updateSettings(buildNextSettings({ madeForKids: checked }))
              }
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("Tags")}</Label>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(event) => setTagInput(event.target.value)}
            placeholder={t("Add a tag and press Enter")}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                addTag();
              }
            }}
          />
          <Button type="button" variant="secondary" onClick={addTag}>
            <Plus className="mr-2 h-4 w-4" />
            {t("Add")}
          </Button>
        </div>

        {tags.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button
                  type="button"
                  className="rounded-sm"
                  onClick={() => removeTag(tag)}
                  aria-label={t("Remove tag {tag}", { tag })}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t("No tags added")}
          </p>
        )}
      </div>

      <div className="space-y-3 rounded-lg border border-border p-3">
        <div className="flex items-center justify-between gap-3">
          <Label>{t("YouTube thumbnail")}</Label>
          {settings.thumbnail ? (
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
              {t("Upload YouTube thumbnail")}
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

        {settings.thumbnail ? (
          <div className="rounded-md border border-border p-2">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-xs text-muted-foreground">
                {settings.thumbnail.url}
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

      {media.length !== 1 || media[0]?.type !== "video" ? (
        <p className="text-xs text-destructive">
          {t("YouTube requires exactly one video media item.")}
        </p>
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
