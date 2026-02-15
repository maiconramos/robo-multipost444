"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns/format";
import { toast } from "sonner";
import {
  useCreatePost,
  useAccounts,
  useCurrentProfileId,
  useAIAvailable,
  useUploadMedia,
  type Account,
  type UploadedMedia,
} from "@/hooks";
import type { GenerateImageResult } from "@/lib/ai/types";
import type { Platform, PlatformSpecificData } from "@/lib/platforms/types";
import { useAppStore } from "@/stores";
import { translateErrorMessage } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/use-i18n";
import {
  type NormalizedPlatformPayload,
  validateAndNormalizePlatformPayloads,
} from "@/lib/posts/platform-settings-schema";
import { getProviderCatalogEntry } from "@/lib/providers/catalog";
import {
  MIN_SCHEDULE_LEAD_MINUTES,
  getMinimumScheduledAt,
  roundToNextMinute,
  validateScheduledAt,
} from "@/lib/posts/scheduling";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PlatformSelector } from "@/components/compose/platform-selector";
import { AIAssistant } from "@/components/compose/ai-assistant";
import { AIImageGenerator } from "@/components/compose/ai-image-generator";
import { MediaLibraryModal } from "@/components/media/media-library-modal";
import {
  SchedulePicker,
  type ScheduleType,
} from "@/components/compose/schedule-picker";
import { PostPreview } from "@/components/compose/post-preview";
import { SettingsPanel } from "@/components/compose/settings/settings-panel";
import {
  Calendar,
  Image as ImageIcon,
  Loader2,
  Send,
  Sparkles,
  Wand2,
  X,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ComposeFormProps {
  initialDate?: Date;
  onSuccess?: () => void;
}

function toMediaItemsForValidation(media: UploadedMedia[]) {
  return media.map((item) => ({
    type: item.type,
    url: item.url,
    key: item.key,
    provider: item.provider,
    filename: item.filename,
    contentType: item.contentType,
    size: item.size,
  }));
}

function mapValidationIssuesByAccount(issues: Array<{ accountId?: string; message: string }>) {
  const byAccount: Record<string, string[]> = {};
  const global: string[] = [];

  issues.forEach((issue) => {
    if (issue.accountId) {
      byAccount[issue.accountId] = byAccount[issue.accountId]
        ? [...byAccount[issue.accountId], issue.message]
        : [issue.message];
    } else {
      global.push(issue.message);
    }
  });

  return { byAccount, global };
}

function formatTimeValue(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

function parseTimeValue(timeValue: string): { hours: number; minutes: number } {
  const [hoursRaw, minutesRaw] = timeValue.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);

  return {
    hours: Number.isFinite(hours) ? hours : 0,
    minutes: Number.isFinite(minutes) ? minutes : 0,
  };
}

function toScheduledDateTime(
  date: Date | undefined,
  timeValue: string,
): Date | undefined {
  if (!date) {
    return undefined;
  }

  const { hours, minutes } = parseTimeValue(timeValue);
  const scheduledAt = new Date(date);
  scheduledAt.setHours(hours, minutes, 0, 0);
  return scheduledAt;
}

function isSameLocalDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getInitialScheduleState(initialDate?: Date): {
  scheduleType: ScheduleType;
  scheduledDate: Date | undefined;
  scheduledTime: string;
} {
  if (!initialDate) {
    return {
      scheduleType: "now",
      scheduledDate: undefined,
      scheduledTime: "09:00",
    };
  }

  const now = new Date();
  const minScheduledAt = roundToNextMinute(getMinimumScheduledAt(now));
  const baseDate = new Date(initialDate);

  // Do not initialize with past dates in the composer.
  if (baseDate.getTime() < now.getTime() && !isSameLocalDate(baseDate, now)) {
    return {
      scheduleType: "scheduled",
      scheduledDate: minScheduledAt,
      scheduledTime: formatTimeValue(minScheduledAt),
    };
  }

  if (isSameLocalDate(baseDate, now)) {
    return {
      scheduleType: "scheduled",
      scheduledDate: baseDate,
      scheduledTime: formatTimeValue(minScheduledAt),
    };
  }

  return {
    scheduleType: "scheduled",
    scheduledDate: baseDate,
    scheduledTime: "09:00",
  };
}

export function ComposeForm({ initialDate, onSuccess }: ComposeFormProps) {
  const { timezone } = useAppStore();
  const { t } = useI18n();
  const profileId = useCurrentProfileId();
  const { data: accountsData } = useAccounts();
  const { data: aiAvailability } = useAIAvailable();
  const uploadMediaMutation = useUploadMedia();
  const createPostMutation = useCreatePost();

  const [content, setContent] = useState("");
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [settingsByAccountId, setSettingsByAccountId] = useState<
    Record<string, PlatformSpecificData | undefined>
  >({});
  const [settingsErrorsByAccountId, setSettingsErrorsByAccountId] = useState<
    Record<string, string[]>
  >({});
  const [settingsGlobalErrors, setSettingsGlobalErrors] = useState<string[]>([]);
  const [storageProvider, setStorageProvider] = useState<string | null>(null);
  const initialScheduleState = useMemo(
    () => getInitialScheduleState(initialDate),
    [initialDate],
  );
  const [scheduleType, setScheduleType] = useState<ScheduleType>(
    initialScheduleState.scheduleType,
  );
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(
    initialScheduleState.scheduledDate,
  );
  const [scheduledTime, setScheduledTime] = useState(
    initialScheduleState.scheduledTime,
  );
  const [isAIAssistantOpen, setIsAIAssistantOpen] = useState(false);
  const [isAIImageGeneratorOpen, setIsAIImageGeneratorOpen] = useState(false);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);

  const accounts = useMemo(
    () => ((accountsData?.accounts || []) as Account[]),
    [accountsData?.accounts],
  );
  const accountById = useMemo(
    () =>
      new Map(accounts.map((account) => [account._id, account] as const)),
    [accounts],
  );

  const selectedAccounts = useMemo(
    () =>
      selectedAccountIds
        .map((accountId) => accountById.get(accountId))
        .filter((account): account is Account => !!account),
    [accountById, selectedAccountIds],
  );

  const selectedPlatforms = selectedAccounts.map(
    (account) => account.platform as Platform,
  );
  const primaryAccount = selectedAccounts[0];
  const primaryPlatform = selectedPlatforms[0];

  const hasVideo = media.some((m) => m.type === "video");
  const hasImages = media.some((m) => m.type === "image");
  const aiAvailable = aiAvailability?.available ?? false;

  const charCount = content.length;
  const charLimit = 280;
  const scheduledAt = useMemo(
    () => toScheduledDateTime(scheduledDate, scheduledTime),
    [scheduledDate, scheduledTime],
  );
  const scheduleValidationMessage = useMemo(() => {
    if (scheduleType !== "scheduled") {
      return null;
    }

    if (!scheduledAt) {
      return t("Select both date and time to schedule");
    }

    const validation = validateScheduledAt(scheduledAt);
    if (!validation.ok) {
      return t(
        "Scheduled time must be at least {minutes} minutes in the future.",
        { minutes: MIN_SCHEDULE_LEAD_MINUTES },
      );
    }

    return null;
  }, [scheduleType, scheduledAt, t]);

  const draftDateValidationMessage = useMemo(() => {
    if (scheduleType !== "draft" || !scheduledAt) {
      return null;
    }

    const validation = validateScheduledAt(scheduledAt);
    if (!validation.ok) {
      return t(
        "Scheduled time must be at least {minutes} minutes in the future.",
        { minutes: MIN_SCHEDULE_LEAD_MINUTES },
      );
    }

    return null;
  }, [scheduleType, scheduledAt, t]);

  const canSubmit =
    selectedAccountIds.length > 0 &&
    (content.trim().length > 0 || media.length > 0) &&
    !createPostMutation.isPending &&
    !scheduleValidationMessage &&
    !draftDateValidationMessage;

  useEffect(() => {
    let isMounted = true;

    void fetch("/api/media/upload")
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }
        return (await response.json()) as { provider?: string };
      })
      .then((payload) => {
        if (isMounted) {
          setStorageProvider(payload?.provider ?? null);
        }
      })
      .catch(() => {
        if (isMounted) {
          setStorageProvider(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const nextScheduleState = getInitialScheduleState(initialDate);
    setScheduleType(nextScheduleState.scheduleType);
    setScheduledDate(nextScheduleState.scheduledDate);
    setScheduledTime(nextScheduleState.scheduledTime);
  }, [initialDate]);

  useEffect(() => {
    if (scheduleType !== "scheduled") {
      return;
    }

    const minScheduledAt = roundToNextMinute(getMinimumScheduledAt());

    if (!scheduledDate) {
      setScheduledDate(minScheduledAt);
      setScheduledTime(formatTimeValue(minScheduledAt));
      return;
    }

    if (!isSameLocalDate(scheduledDate, new Date())) {
      return;
    }

    const currentScheduledAt = toScheduledDateTime(scheduledDate, scheduledTime);
    if (!currentScheduledAt) {
      setScheduledTime(formatTimeValue(minScheduledAt));
      return;
    }

    if (currentScheduledAt.getTime() < minScheduledAt.getTime()) {
      setScheduledTime(formatTimeValue(minScheduledAt));
    }
  }, [scheduleType, scheduledDate, scheduledTime]);

  const clearValidationErrors = () => {
    setSettingsErrorsByAccountId({});
    setSettingsGlobalErrors([]);
  };

  const handleSettingsChange = (
    accountId: string,
    nextValue: PlatformSpecificData | undefined,
  ) => {
    setSettingsByAccountId((current) => ({
      ...current,
      [accountId]: nextValue,
    }));

    setSettingsErrorsByAccountId((current) => {
      if (!current[accountId]) {
        return current;
      }
      const next = { ...current };
      delete next[accountId];
      return next;
    });

    setSettingsGlobalErrors([]);
  };

  const validatePlatformSettings = (): {
    ok: true;
    data: NormalizedPlatformPayload[];
  } | {
    ok: false;
  } => {
    const profileIds = new Set(selectedAccounts.map((account) => account.profileId));
    if (profileIds.size > 1) {
      setSettingsGlobalErrors(["All selected accounts must belong to the same profile."]);
      return { ok: false };
    }

    const validationInput = selectedAccounts.map((account) => {
      const providerEntry = getProviderCatalogEntry(account.providerIdentifier);
      return {
        accountId: account.id,
        platform: account.platform as Platform,
        providerIdentifier: account.providerIdentifier,
        settingsSchemaKey: providerEntry?.settingsSchemaKey,
        platformSpecificData: settingsByAccountId[account.id],
      };
    });

    const normalizedResult = validateAndNormalizePlatformPayloads({
      platforms: validationInput,
      mediaItems: toMediaItemsForValidation(media),
    });

    if (!normalizedResult.ok) {
      const mapped = mapValidationIssuesByAccount(normalizedResult.issues);
      setSettingsErrorsByAccountId(mapped.byAccount);
      setSettingsGlobalErrors(mapped.global);
      return { ok: false };
    }

    clearValidationErrors();

    return {
      ok: true,
      data: normalizedResult.data,
    };
  };

  const handleApplyAIText = (generatedText: string) => {
    setContent(generatedText);
  };

  const handleUseAIImage = async (image: GenerateImageResult) => {
    const url = image.imageUrl.trim();
    if (!url) {
      throw new Error(t("Generated image URL is empty"));
    }

    if (url.startsWith("data:image/")) {
      const response = await fetch(url);
      const blob = await response.blob();
      const fileType = blob.type || "image/png";
      const extension = fileType.split("/")[1] || "png";
      const file = new File([blob], `ai-generated-${Date.now()}.${extension}`, {
        type: fileType,
      });

      const uploaded = await uploadMediaMutation.mutateAsync(file);
      setMedia((current) => [...current, uploaded]);
      return;
    }

    if (url.startsWith("http://") || url.startsWith("https://")) {
      setMedia((current) => [
        ...current,
        {
          url,
          key: url,
          provider: "URL_ONLY",
          type: "image",
          filename: `ai-generated-${Date.now()}.png`,
          contentType: "image/png",
          size: 0,
        },
      ]);
      return;
    }

    throw new Error(t("Unsupported generated image format"));
  };

  const handleSubmit = async () => {
    if (!canSubmit || !profileId) {
      return;
    }

    if (scheduleType === "scheduled") {
      if (!scheduledAt) {
        toast.error(t("Select both date and time to schedule"));
        return;
      }

      const validation = validateScheduledAt(scheduledAt);
      if (!validation.ok) {
        toast.error(
          t("Scheduled time must be at least {minutes} minutes in the future.", {
            minutes: MIN_SCHEDULE_LEAD_MINUTES,
          }),
        );
        return;
      }
    }

    const validationResult = validatePlatformSettings();
    if (!validationResult.ok) {
      toast.error(t("Please fix platform settings before publishing"));
      return;
    }

    try {
      let scheduledFor: string | undefined;
      if ((scheduleType === "scheduled" || scheduleType === "draft") && scheduledAt) {
        scheduledFor = scheduledAt.toISOString();
      }

      const mediaItems = media.map((m) => ({
        type: m.type,
        url: m.url,
        key: m.key,
        provider: m.provider,
        filename: m.filename,
        contentType: m.contentType,
        size: m.size,
      }));

      const createdPost = await createPostMutation.mutateAsync({
        content,
        platforms: validationResult.data.map((platformEntry) => ({
          accountId: platformEntry.accountId,
          platform: platformEntry.platform,
          customContent: platformEntry.customContent,
          platformSpecificData: platformEntry.platformSpecificData,
        })),
        mediaItems: mediaItems.length > 0 ? mediaItems : undefined,
        publishNow: scheduleType === "now",
        scheduledFor,
        timezone,
        queuedFromProfile: scheduleType === "queue" ? profileId : undefined,
        saveDraft: scheduleType === "draft",
      });

      if (scheduleType === "now") {
        if (createdPost.post.status === "published") {
          toast.success(t("Post published!"));
        } else if (createdPost.post.status === "failed") {
          toast.error(t("Publish failed. Check logs for details."));
        } else if (createdPost.publishExecution === "queued_fallback") {
          toast.success(t("Post queued for cron fallback. Check logs for details."));
        } else {
          toast.success(t("Post queued. Processing in background."));
        }
      } else if (scheduleType === "draft") {
        toast.success(t("Draft saved! It will need approval before publishing."));
      } else {
        toast.success(
          scheduleType === "queue"
            ? t("Post added to queue!")
            : t("Post scheduled!"),
        );
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      toast.error(
        translateErrorMessage(error, t, "Failed to create post. Please try again."),
      );
    }
  };

  const removeMedia = (index: number) => {
    setMedia(media.filter((_, i) => i !== index));
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="flex h-full flex-col lg:col-span-2">
        <div className="mb-4">
          <PlatformSelector
            selectedAccountIds={selectedAccountIds}
            onSelectionChange={setSelectedAccountIds}
            _hasVideo={hasVideo}
            _hasImages={hasImages}
          />
        </div>

        <div className="flex min-h-[400px] flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="flex-1 p-4">
            <Textarea
              placeholder={t("What's on your mind?")}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className="min-h-[200px] resize-none border-none p-0 text-lg shadow-none focus-visible:ring-0"
            />
          </div>

          {media.length > 0 && (
            <div className="grid grid-cols-2 gap-2 px-4 pb-4 sm:grid-cols-3">
              {media.map((item, index) => (
                <div
                  key={`${item.url}-${index}`}
                  className="group relative aspect-square overflow-hidden rounded-md bg-muted"
                >
                  {item.type === "video" ? (
                    <video src={item.url} className="h-full w-full object-cover" />
                  ) : (
                    <img src={item.url} alt="" className="h-full w-full object-cover" />
                  )}
                  <button
                    onClick={() => removeMedia(index)}
                    className="absolute right-1 top-1 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label={t("Remove media")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between border-t bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsMediaLibraryOpen(true)}
                    >
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("Open Media Library")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsAIAssistantOpen(true)}
                      disabled={!aiAvailable}
                    >
                      <Sparkles className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("AI Assistant")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsAIImageGeneratorOpen(true)}
                      disabled={!aiAvailable}
                    >
                      <Wand2 className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("Generate Image")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex items-center gap-4">
              <span
                className={`text-xs ${
                  charCount > charLimit ? "text-destructive" : "text-muted-foreground"
                }`}
              >
                {charCount} / {charLimit}
              </span>
            </div>
          </div>
        </div>

        {selectedAccounts.length > 0 ? (
          <div className="mt-4">
            <SettingsPanel
              accounts={selectedAccounts}
              media={media}
              settingsByAccountId={settingsByAccountId}
              errorsByAccountId={settingsErrorsByAccountId}
              onSettingsChange={handleSettingsChange}
              storageProvider={storageProvider}
            />
          </div>
        ) : null}

        {settingsGlobalErrors.length > 0 ? (
          <div className="mt-2 space-y-1 px-1">
            {settingsGlobalErrors.map((error, index) => (
              <p key={`${error}-${index}`} className="text-xs text-destructive">
                {t(error)}
              </p>
            ))}
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-between">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "gap-2",
                  scheduleType !== "now" && "border-primary text-primary",
                )}
              >
                <Calendar className="h-4 w-4" />
                {scheduleType === "now"
                  ? t("Schedule")
                  : scheduleType === "queue"
                    ? t("Add to queue")
                    : scheduleType === "draft"
                      ? t("Save as Draft")
                      : format(scheduledAt || new Date(), "MMM d, HH:mm")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="start">
              <SchedulePicker
                scheduleType={scheduleType}
                scheduledDate={scheduledDate}
                scheduledTime={scheduledTime}
                onScheduleTypeChange={setScheduleType}
                onDateChange={setScheduledDate}
                onTimeChange={setScheduledTime}
              />
            </PopoverContent>
          </Popover>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            size="lg"
            className="min-w-[140px]"
          >
            {createPostMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("Working...")}
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {scheduleType === "now"
                  ? t("Publish Now")
                  : scheduleType === "queue"
                    ? t("Add to Queue")
                    : scheduleType === "draft"
                      ? t("Save as Draft")
                      : t("Schedule")}
              </>
            )}
          </Button>
        </div>

        {scheduleValidationMessage ? (
          <p className="mt-2 text-sm text-destructive">
            {scheduleValidationMessage}
          </p>
        ) : null}

        {draftDateValidationMessage ? (
          <p className="mt-2 text-sm text-destructive">
            {draftDateValidationMessage}
          </p>
        ) : null}

        {selectedAccountIds.length === 0 ? (
          <p className="mt-2 text-right text-xs text-muted-foreground animate-pulse">
            {t("Select at least one account above to post")}
          </p>
        ) : null}
      </div>

      <div className="hidden h-full lg:block">
        <div className="sticky top-6">
          <PostPreview
            content={content}
            media={media}
            platforms={selectedPlatforms}
            author={{
              name:
                primaryAccount?.displayName ||
                primaryAccount?.username ||
                t("Your Account"),
              image: primaryAccount?.profilePicture,
            }}
          />
        </div>
      </div>

      <AIAssistant
        open={isAIAssistantOpen}
        onOpenChange={setIsAIAssistantOpen}
        content={content}
        platform={primaryPlatform}
        onApplyText={handleApplyAIText}
      />

      <AIImageGenerator
        open={isAIImageGeneratorOpen}
        onOpenChange={setIsAIImageGeneratorOpen}
        onUseImage={handleUseAIImage}
      />

      <MediaLibraryModal
        open={isMediaLibraryOpen}
        onOpenChange={setIsMediaLibraryOpen}
        onSelect={(selectedMedia) => {
          const maxFiles = 10;
          const available = maxFiles - media.length;
          if (available <= 0) {
            toast.error(t("Maximum {maxFiles} files allowed", { maxFiles }));
            return;
          }
          setMedia((current) => [
            ...current,
            ...selectedMedia.slice(0, available),
          ]);
        }}
        maxSelectable={10 - media.length}
      />
    </div>
  );
}
