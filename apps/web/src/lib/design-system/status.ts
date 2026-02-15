import { cn } from "@/lib/utils";

export type SemanticTone = "info" | "success" | "warning" | "danger" | "neutral";

export type PostUiStatus =
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed";

interface PostUiStatusConfig {
  label: string;
  tone: SemanticTone;
}

export const semanticToneBadgeClassNames: Record<SemanticTone, string> = {
  info: "border-status-info-border bg-status-info-bg text-status-info-fg",
  success:
    "border-status-success-border bg-status-success-bg text-status-success-fg",
  warning:
    "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
  danger: "border-status-danger-border bg-status-danger-bg text-status-danger-fg",
  neutral:
    "border-status-neutral-border bg-status-neutral-bg text-status-neutral-fg",
};

export const semanticToneTextClassNames: Record<SemanticTone, string> = {
  info: "text-status-info-fg",
  success: "text-status-success-fg",
  warning: "text-status-warning-fg",
  danger: "text-status-danger-fg",
  neutral: "text-status-neutral-fg",
};

export const semanticToneSurfaceClassNames: Record<SemanticTone, string> = {
  info: "border-status-info-border bg-status-info-bg text-status-info-fg",
  success:
    "border-status-success-border bg-status-success-bg text-status-success-fg",
  warning:
    "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
  danger: "border-status-danger-border bg-status-danger-bg text-status-danger-fg",
  neutral:
    "border-status-neutral-border bg-status-neutral-bg text-status-neutral-fg",
};

export const semanticToneCalendarItemClassNames: Record<SemanticTone, string> = {
  info: "border-l-2 border-l-status-info-border bg-status-info-bg text-status-info-fg hover:brightness-95",
  success:
    "border-l-2 border-l-status-success-border bg-status-success-bg text-status-success-fg hover:brightness-95",
  warning:
    "border-l-2 border-l-status-warning-border bg-status-warning-bg text-status-warning-fg hover:brightness-95",
  danger:
    "border-l-2 border-l-status-danger-border bg-status-danger-bg text-status-danger-fg hover:brightness-95",
  neutral:
    "border-l-2 border-l-status-neutral-border bg-status-neutral-bg text-status-neutral-fg hover:brightness-95",
};

export const postUiStatusConfig: Record<PostUiStatus, PostUiStatusConfig> = {
  draft: {
    label: "Draft",
    tone: "neutral",
  },
  scheduled: {
    label: "Scheduled",
    tone: "info",
  },
  publishing: {
    label: "Publishing",
    tone: "warning",
  },
  published: {
    label: "Published",
    tone: "success",
  },
  failed: {
    label: "Failed",
    tone: "danger",
  },
};

export function getPostUiStatusConfig(status: PostUiStatus) {
  return postUiStatusConfig[status];
}

export function getPostStatusTone(status: PostUiStatus): SemanticTone {
  return getPostUiStatusConfig(status).tone;
}

export function getSemanticToneBadgeClassName(tone: SemanticTone) {
  return semanticToneBadgeClassNames[tone];
}

export function getSemanticToneTextClassName(tone: SemanticTone) {
  return semanticToneTextClassNames[tone];
}

export function getSemanticToneSurfaceClassName(tone: SemanticTone) {
  return semanticToneSurfaceClassNames[tone];
}

export function getSemanticToneCalendarItemClassName(tone: SemanticTone) {
  return semanticToneCalendarItemClassNames[tone];
}

export function withSemanticToneBadgeClass(tone: SemanticTone, className?: string) {
  return cn(getSemanticToneBadgeClassName(tone), className);
}
