"use client";

import { useCallback, useEffect, useState } from "react";
import {
  useUploadMedia,
  type UploadedMedia,
  getMediaTypeByUrl,
  getMediaMimeTypeByUrl,
  isValidMediaType,
} from "@/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/use-i18n";
import {
  Upload,
  X,
  Image as ImageIcon,
  Video,
  Loader2,
  Link2,
} from "lucide-react";

interface MediaUploaderProps {
  media: UploadedMedia[];
  onMediaChange: (media: UploadedMedia[]) => void;
  maxFiles?: number;
}

export function MediaUploader({
  media,
  onMediaChange,
  maxFiles = 10,
}: MediaUploaderProps) {
  const { t } = useI18n();
  const [isDragging, setIsDragging] = useState(false);
  const [mediaUrl, setMediaUrl] = useState("");
  const [provider, setProvider] = useState<string | null>(null);
  const uploadMutation = useUploadMedia();

  useEffect(() => {
    let isMounted = true;

    void fetch("/api/media/upload")
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return (await response.json()) as { provider?: string };
      })
      .then((data) => {
        if (isMounted && data?.provider) {
          setProvider(data.provider);
        }
      })
      .catch(() => {
        // Ignore provider detection failures; uploader still works with file uploads.
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const isUrlOnlyMode = provider === "URL_ONLY";

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      if (isUrlOnlyMode) {
        toast.error(t("URL-only storage is enabled. Add media via URL below."));
        return;
      }

      const fileArray = Array.from(files);
      const nextMedia = [...media];

      // Validate file count
      if (media.length + fileArray.length > maxFiles) {
        toast.error(t("Maximum {maxFiles} files allowed", { maxFiles }));
        return;
      }

      // Validate file types
      const invalidFiles = fileArray.filter((f) => !isValidMediaType(f));
      if (invalidFiles.length > 0) {
        toast.error(t("Some files have invalid types"));
        return;
      }

      // Upload files
      for (const file of fileArray) {
        try {
          const uploaded = await uploadMutation.mutateAsync(file);
          nextMedia.push(uploaded);
          onMediaChange([...nextMedia]);
        } catch (error) {
          if (error instanceof Error) {
            toast.error(t(error.message));
          } else {
            toast.error(t("Failed to upload {fileName}", { fileName: file.name }));
          }
        }
      }
    },
    [isUrlOnlyMode, media, onMediaChange, maxFiles, uploadMutation, t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
      }
    },
    [handleFiles]
  );

  const removeMedia = (index: number) => {
    onMediaChange(media.filter((_, i) => i !== index));
  };

  const addMediaByUrl = useCallback(() => {
    const value = mediaUrl.trim();
    if (!value) {
      return;
    }

    if (media.length >= maxFiles) {
      toast.error(t("Maximum {maxFiles} files allowed", { maxFiles }));
      return;
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(value);
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        throw new Error("URL must use http or https");
      }
    } catch {
      toast.error(t("Please enter a valid media URL"));
      return;
    }

    const type = getMediaTypeByUrl(parsedUrl.toString());
    const inferredContentType =
      getMediaMimeTypeByUrl(parsedUrl.toString()) ||
      "application/octet-stream";
    const filename = decodeURIComponent(
      parsedUrl.pathname.split("/").pop() || "external-media"
    );

    onMediaChange([
      ...media,
      {
        url: parsedUrl.toString(),
        key: parsedUrl.toString(),
        provider: "URL_ONLY",
        type,
        filename,
        contentType: inferredContentType,
        size: 0,
      },
    ]);

    setMediaUrl("");
  }, [mediaUrl, media, maxFiles, onMediaChange, t]);

  return (
    <div className="space-y-4">
      {/* Upload area */}
      {!isUrlOnlyMode && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground"
          }`}
        >
          <input
            type="file"
            accept="image/*,video/*"
            multiple
            onChange={handleInputChange}
            className="absolute inset-0 cursor-pointer opacity-0"
            disabled={uploadMutation.isPending}
          />
          <div className="flex flex-col items-center gap-2">
            {uploadMutation.isPending ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <p className="text-sm text-muted-foreground">
              {uploadMutation.isPending
                ? t("Uploading...")
                : t("Drop files here or click to upload")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("Images (JPG, PNG, GIF, WebP) or Videos (MP4, MOV, WebM)")}
            </p>
          </div>
        </div>
      )}

      {isUrlOnlyMode && (
        <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
          {t("URL-only storage is active. Add media using a public image or video URL.")}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link2 className="h-3.5 w-3.5" />
          {t("Add media by URL")}
        </div>
        <div className="flex gap-2">
          <Input
            value={mediaUrl}
            onChange={(event) => setMediaUrl(event.target.value)}
            placeholder="https://example.com/media.jpg"
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addMediaByUrl();
              }
            }}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={addMediaByUrl}
            disabled={!mediaUrl.trim()}
          >
            {t("Add URL")}
          </Button>
        </div>
      </div>

      {/* Media preview */}
      {media.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {media.map((item, index) => (
            <div
              key={index}
              className="group relative aspect-square overflow-hidden rounded-lg bg-muted"
            >
              {item.type === "video" ? (
                <video
                  src={item.url}
                  className="h-full w-full object-cover"
                />
              ) : (
                <img
                  src={item.url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="destructive"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeMedia(index)}
                  aria-label={t("Remove {type} {index}", {
                    type: item.type === "video" ? t("video") : t("image"),
                    index: index + 1,
                  })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="absolute bottom-1 left-1">
                {item.type === "video" ? (
                  <Video className="h-4 w-4 text-white drop-shadow" />
                ) : (
                  <ImageIcon className="h-4 w-4 text-white drop-shadow" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Media count */}
      {media.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("{count} / {maxFiles} files", {
            count: media.length,
            maxFiles,
          })}
        </p>
      )}
    </div>
  );
}
