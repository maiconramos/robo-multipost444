"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Loader2,
  Trash2,
  Upload,
  VideoIcon,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/use-i18n";
import {
  useMediaAssets,
  useCreateMediaAsset,
  useDeleteMediaAsset,
  useClearMediaAssets,
  useMediaStorageStatus,
  type MediaAssetsFilters,
} from "@/hooks/use-media-assets";
import { useUploadMedia, isValidMediaType } from "@/hooks";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { MediaAssetCard } from "@/components/media/media-asset-card";
import { MediaStorageStatus } from "@/components/media/media-storage-status";

interface UploadingFile {
  id: string;
  name: string;
  status: "uploading" | "registering" | "done" | "error";
  error?: string;
}

export default function MediaPage() {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [typeFilter, setTypeFilter] = useState<
    MediaAssetsFilters["type"] | undefined
  >(undefined);
  const [page, setPage] = useState(1);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const filters: MediaAssetsFilters = { type: typeFilter, page, limit: 30 };
  const { data, isLoading } = useMediaAssets(filters);
  const {
    data: storageStatus,
    isLoading: isStorageStatusLoading,
    isError: isStorageStatusError,
  } = useMediaStorageStatus();
  const uploadMediaMutation = useUploadMedia();
  const createAssetMutation = useCreateMediaAsset();
  const deleteAssetMutation = useDeleteMediaAsset();
  const clearAssetsMutation = useClearMediaAssets();

  const assets = useMemo(() => data?.assets || [], [data?.assets]);
  const totalPages = data?.pages || 1;

  const handleUploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files).filter(isValidMediaType);
      if (fileArray.length === 0) return;

      for (const file of fileArray) {
        const uploadId = crypto.randomUUID();
        setUploadingFiles((prev) => [
          ...prev,
          { id: uploadId, name: file.name, status: "uploading" },
        ]);

        try {
          const uploaded = await uploadMediaMutation.mutateAsync(file);

          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === uploadId ? { ...f, status: "registering" as const } : f,
            ),
          );

          await createAssetMutation.mutateAsync({
            type: uploaded.type,
            url: uploaded.url,
            key: uploaded.key,
            provider: uploaded.provider,
            filename: uploaded.filename,
            contentType: uploaded.contentType,
            size: uploaded.size,
          });

          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === uploadId ? { ...f, status: "done" as const } : f,
            ),
          );

          setTimeout(() => {
            setUploadingFiles((prev) =>
              prev.filter((f) => f.id !== uploadId),
            );
          }, 2000);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Upload failed";
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.id === uploadId
                ? { ...f, status: "error" as const, error: message }
                : f,
            ),
          );
          toast.error(
            t("Failed to upload {fileName}", { fileName: file.name }),
          );
        }
      }
    },
    [uploadMediaMutation, createAssetMutation, t],
  );

  const handleDeleteAsset = useCallback(
    async (assetId: string) => {
      try {
        await deleteAssetMutation.mutateAsync(assetId);
        toast.success(t("Media deleted"));
      } catch {
        toast.error(t("Failed to delete media"));
      }
    },
    [deleteAssetMutation, t],
  );

  const handleClearAll = useCallback(async () => {
    try {
      const result = await clearAssetsMutation.mutateAsync();
      toast.success(
        t("{count} media files deleted", {
          count: result.deletedCount,
        }),
      );
    } catch {
      toast.error(t("Failed to delete media"));
    }
  }, [clearAssetsMutation, t]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleUploadFiles(e.target.files);
      e.target.value = "";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  const isUploading = uploadingFiles.some(
    (f) => f.status === "uploading" || f.status === "registering",
  );

  return (
    <div
      className="relative space-y-6"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("Media Library")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Upload images or videos to build your library. You can drag and drop files here.")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            multiple
            accept="image/*,video/*"
            onChange={handleFileInputChange}
          />

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                disabled={clearAssetsMutation.isPending || (data?.total ?? 0) === 0}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("Clear All Media")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("Clear All Media")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("This will permanently delete all media from your workspace storage. This action cannot be undone.")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={handleClearAll}>
                  {clearAssetsMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {t("Delete All")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            {t("Upload Media")}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/20 px-4 py-3">
        {isStorageStatusLoading ? (
          <div className="space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-2 w-full animate-pulse rounded bg-muted" />
          </div>
        ) : storageStatus ? (
          <MediaStorageStatus status={storageStatus} />
        ) : isStorageStatusError ? (
          <p className="text-sm text-muted-foreground">
            {t("Unable to load storage details right now.")}
          </p>
        ) : null}
      </div>

      {/* Upload progress strip */}
      {uploadingFiles.length > 0 && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3">
          {uploadingFiles.map((file) => (
            <div key={file.id} className="flex items-center gap-2 text-sm">
              <Loader2
                className={`h-3.5 w-3.5 ${
                  file.status === "done"
                    ? "text-primary"
                    : file.status === "error"
                      ? "text-destructive"
                      : "animate-spin text-muted-foreground"
                }`}
              />
              <span className="truncate">{file.name}</span>
              <span className="text-muted-foreground">
                {file.status === "uploading" && t("Uploading...")}
                {file.status === "registering" && t("Encoding...")}
                {file.status === "done" && "OK"}
                {file.status === "error" && file.error}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/10">
          <div className="text-center">
            <Upload className="mx-auto h-10 w-10 text-primary" />
            <p className="mt-2 text-lg font-medium text-primary">
              {t("Drop files here or click to upload")}
            </p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex items-center gap-2">
        <Button
          variant={!typeFilter ? "default" : "ghost"}
          size="sm"
          onClick={() => {
            setTypeFilter(undefined);
            setPage(1);
          }}
        >
          {t("All")}
        </Button>
        <Button
          variant={typeFilter === "image" ? "default" : "ghost"}
          size="sm"
          onClick={() => {
            setTypeFilter("image");
            setPage(1);
          }}
        >
          <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
          {t("Images")}
        </Button>
        <Button
          variant={typeFilter === "video" ? "default" : "ghost"}
          size="sm"
          onClick={() => {
            setTypeFilter("video");
            setPage(1);
          }}
        >
          <VideoIcon className="mr-1.5 h-3.5 w-3.5" />
          {t("Videos")}
        </Button>

        {data?.total != null && (
          <span className="ml-auto text-sm text-muted-foreground">
            {data.total} {data.total === 1 ? "item" : "items"}
          </span>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : assets.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <ImageIcon className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">{t("No media found")}</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {t("Upload images or videos to build your library. You can drag and drop files here.")}
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            {t("Upload Media")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {assets.map((asset) => (
            <MediaAssetCard
              key={asset.id}
              asset={asset}
              selected={false}
              selectionOrder={null}
              onToggleSelect={() => {}}
              onDelete={handleDeleteAsset}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
