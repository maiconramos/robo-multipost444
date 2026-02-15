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
  type MediaAsset,
  type MediaAssetsFilters,
} from "@/hooks/use-media-assets";
import { useUploadMedia, isValidMediaType, type UploadedMedia } from "@/hooks";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { MediaAssetCard } from "./media-asset-card";
import { MediaStorageStatus } from "./media-storage-status";

interface MediaLibraryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (media: UploadedMedia[]) => void;
  maxSelectable?: number;
}

interface UploadingFile {
  id: string;
  name: string;
  status: "uploading" | "registering" | "done" | "error";
  error?: string;
}

function assetToUploadedMedia(asset: MediaAsset): UploadedMedia {
  return {
    url: asset.url,
    key: asset.key || asset.url,
    provider: (asset.provider as UploadedMedia["provider"]) || "VERCEL_BLOB",
    type: asset.type,
    filename: asset.filename || "",
    contentType: asset.contentType || "",
    size: asset.size || 0,
  };
}

export function MediaLibraryModal({
  open,
  onOpenChange,
  onSelect,
  maxSelectable = 10,
}: MediaLibraryModalProps) {
  const { t } = useI18n();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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

  const handleToggleSelect = useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        if (prev.includes(id)) return prev.filter((i) => i !== id);
        if (prev.length >= maxSelectable) return prev;
        return [...prev, id];
      });
    },
    [maxSelectable],
  );

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

          // Auto-remove completed after short delay
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
        setSelectedIds((prev) => prev.filter((id) => id !== assetId));
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
      setSelectedIds([]);
      toast.success(
        t("{count} media files deleted", {
          count: result.deletedCount,
        }),
      );
    } catch {
      toast.error(t("Failed to delete media"));
    }
  }, [clearAssetsMutation, t]);

  const handleConfirmSelection = useCallback(() => {
    const selectedAssets = selectedIds
      .map((id) => assets.find((a) => a.id === id))
      .filter(Boolean) as MediaAsset[];
    onSelect(selectedAssets.map(assetToUploadedMedia));
    setSelectedIds([]);
    onOpenChange(false);
  }, [selectedIds, assets, onSelect, onOpenChange]);

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

  const isUploading = uploadingFiles.some((f) => f.status === "uploading" || f.status === "registering");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[85vh] max-w-5xl flex-col !gap-0 !p-0 sm:max-w-5xl overflow-hidden"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b px-6 py-4">
          <DialogHeader className="flex-1">
            <DialogTitle>{t("Media Library")}</DialogTitle>
            <DialogDescription>
              {t("Select or upload pictures (maximum 1 GB per upload).")}
              <br />
              {t("You can also drag & drop pictures.")}
            </DialogDescription>
            <div className="mt-3 max-w-md rounded-md border bg-muted/20 px-3 py-2">
              {isStorageStatusLoading ? (
                <div className="space-y-1.5">
                  <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted" />
                  <div className="h-2.5 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-1.5 w-full animate-pulse rounded bg-muted" />
                </div>
              ) : storageStatus ? (
                <MediaStorageStatus status={storageStatus} variant="compact" />
              ) : isStorageStatusError ? (
                <p className="text-xs text-muted-foreground">
                  {t("Unable to load storage details right now.")}
                </p>
              ) : null}
            </div>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept="image/*,video/*"
              onChange={handleFileInputChange}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {t("Upload")}
            </Button>
          </div>
        </div>

        {/* Upload progress strip */}
        {uploadingFiles.length > 0 && (
          <div className="border-b bg-muted/30 px-6 py-2">
            {uploadingFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-2 text-sm"
              >
                <Loader2
                  className={`h-3.5 w-3.5 ${file.status === "done" ? "text-primary" : file.status === "error" ? "text-destructive" : "animate-spin text-muted-foreground"}`}
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
        <div className="flex items-center gap-2 border-b px-6 py-2">
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
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1">
        <ScrollArea className="h-full bg-muted/10 px-6 py-6">
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
              {assets.map((asset) => {
                const selIndex = selectedIds.indexOf(asset.id);
                return (
                  <MediaAssetCard
                    key={asset.id}
                    asset={asset}
                    selected={selIndex >= 0}
                    selectionOrder={selIndex >= 0 ? selIndex + 1 : null}
                    onToggleSelect={handleToggleSelect}
                    onDelete={handleDeleteAsset}
                    disabled={
                      selectedIds.length >= maxSelectable &&
                      !selectedIds.includes(asset.id)
                    }
                  />
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
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
        </ScrollArea>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-6 py-4">
          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {t("{count} selected", { count: selectedIds.length })}
              </span>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={
                    clearAssetsMutation.isPending ||
                    (data?.total ?? 0) === 0
                  }
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  {t("Clear All Media")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("Clear All Media")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t(
                      "This will permanently delete all media from your workspace storage. This action cannot be undone.",
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={handleClearAll}
                  >
                    {clearAssetsMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {t("Delete All")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("Cancel")}
            </Button>
            <Button
              onClick={handleConfirmSelection}
              disabled={selectedIds.length === 0}
            >
              {t("Add selected media")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
