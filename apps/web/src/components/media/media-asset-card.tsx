"use client";

import { Check, Trash2, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaAsset } from "@/hooks/use-media-assets";

interface MediaAssetCardProps {
  asset: MediaAsset;
  selected: boolean;
  selectionOrder: number | null;
  onToggleSelect: (id: string) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaAssetCard({
  asset,
  selected,
  selectionOrder,
  onToggleSelect,
  onDelete,
  disabled,
}: MediaAssetCardProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !disabled && onToggleSelect(asset.id)}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onToggleSelect(asset.id);
        }
      }}
      className={cn(
        "group relative aspect-square cursor-pointer overflow-hidden rounded-xl border bg-muted transition-all duration-200",
        selected
          ? "border-primary ring-2 ring-primary ring-offset-2"
          : "border-border hover:border-primary/50 hover:shadow-md",
        disabled && !selected && "cursor-not-allowed opacity-50",
      )}
    >
      {asset.type === "video" ? (
        <>
          <video
            src={asset.url}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            muted
            preload="metadata"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20">
            <div className="rounded-full bg-black/50 p-2 text-white backdrop-blur-sm">
              <Play className="h-4 w-4 fill-white" />
            </div>
          </div>
        </>
      ) : (
        <img
          src={asset.url}
          alt={asset.filename || ""}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      )}

      {/* Selection indicator */}
      <div
        className={cn(
          "absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-200",
          selected
            ? "bg-primary text-primary-foreground scale-100 opacity-100 shadow-sm"
            : "bg-black/40 border-2 border-white/80 scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100"
        )}
      >
        {selected ? (
          <span className="text-xs font-bold">{selectionOrder}</span>
        ) : (
          <Check className="h-3.5 w-3.5 text-white" />
        )}
      </div>

      {/* Delete button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(asset.id);
        }}
        className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-sm transition-all duration-200 hover:bg-destructive group-hover:opacity-100 hover:scale-110"
        title="Delete asset"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>

      {/* Filename and size overlay */}
      <div className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-3 pt-8 pb-3 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
        <p className="truncate text-xs font-medium text-white shadow-sm">
          {asset.filename || "Untitled"}
        </p>
        <div className="flex items-center justify-between text-[10px] text-white/80">
          <span>{formatFileSize(asset.size)}</span>
          {asset.width && asset.height && (
            <span>{asset.width}x{asset.height}</span>
          )}
        </div>
      </div>
    </div>
  );
}
