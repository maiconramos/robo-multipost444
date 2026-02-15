"use client";

import { useMemo, useState, type ComponentType } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Loader2,
  Wand2,
  Scissors,
  Hash,
  Languages,
  RefreshCw,
  Check,
} from "lucide-react";
import type { GenerateTextOptions } from "@/lib/ai/types";
import { useGenerateText } from "@/hooks";
import { translateErrorMessage } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/use-i18n";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type PresetId =
  | "generateCaption"
  | "improveText"
  | "makeShorter"
  | "generateHashtags"
  | "translate";

interface AIAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  platform?: string;
  onApplyText: (text: string) => void;
}

interface PresetDefinition {
  id: PresetId;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  needsContext?: boolean;
  buildPrompt: (platform?: string) => string;
}

const PRESETS: PresetDefinition[] = [
  {
    id: "generateCaption",
    label: "Generate caption",
    description: "Create a brand new social media caption.",
    icon: Wand2,
    buildPrompt: (platform) =>
      `Generate an engaging social media caption${
        platform ? ` for ${platform}` : ""
      }. Keep it concise, include a call-to-action, and avoid hashtags unless explicitly asked.`,
  },
  {
    id: "improveText",
    label: "Improve text",
    description: "Keep the meaning but make it more engaging.",
    icon: Sparkles,
    needsContext: true,
    buildPrompt: () =>
      "Improve the existing caption while preserving the original message and tone.",
  },
  {
    id: "makeShorter",
    label: "Make shorter",
    description: "Compress the message into 1-2 sentences.",
    icon: Scissors,
    needsContext: true,
    buildPrompt: () =>
      "Shorten the existing caption to 1-2 sentences while keeping the key message.",
  },
  {
    id: "generateHashtags",
    label: "Generate hashtags",
    description: "Return only 5-10 relevant hashtags.",
    icon: Hash,
    needsContext: true,
    buildPrompt: (platform) =>
      `Generate 5-10 relevant hashtags${
        platform ? ` for ${platform}` : ""
      }. Return only hashtags separated by spaces.`,
  },
  {
    id: "translate",
    label: "Translate",
    description: "Translate/adapt the current text to another language.",
    icon: Languages,
    needsContext: true,
    buildPrompt: () =>
      "Translate the existing caption to English and adapt idioms for natural social media language.",
  },
];

export function AIAssistant({
  open,
  onOpenChange,
  content,
  platform,
  onApplyText,
}: AIAssistantProps) {
  const { t } = useI18n();
  const generateText = useGenerateText();
  const [customPrompt, setCustomPrompt] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const [lastRequest, setLastRequest] = useState<GenerateTextOptions | null>(null);

  const hasContent = useMemo(() => content.trim().length > 0, [content]);

  const runGeneration = async (request: GenerateTextOptions) => {
    setLastRequest(request);

    try {
      const result = await generateText.mutateAsync(request);
      setGeneratedText(result.text);
    } catch (error) {
      toast.error(translateErrorMessage(error, t, "Failed to generate text"));
    }
  };

  const handlePreset = async (preset: PresetDefinition) => {
    if (preset.needsContext && !hasContent) {
      toast.error(t("Write some content first to use this preset"));
      return;
    }

    await runGeneration({
      prompt: preset.buildPrompt(platform),
      context: hasContent ? content : undefined,
      platform,
      maxTokens: 500,
      temperature: 0.7,
    });
  };

  const handleCustomPrompt = async () => {
    const prompt = customPrompt.trim();
    if (!prompt) {
      toast.error(t("Type a custom prompt first"));
      return;
    }

    await runGeneration({
      prompt,
      context: hasContent ? content : undefined,
      platform,
      maxTokens: 500,
      temperature: 0.7,
    });
  };

  const handleUseText = () => {
    const value = generatedText.trim();
    if (!value) {
      return;
    }

    onApplyText(value);
    toast.success(t("AI suggestion applied"));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full p-0 sm:max-w-xl">
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {t("AI Assistant")}
          </SheetTitle>
          <SheetDescription>
            {t("Generate captions, variations, and quick improvements for your post.")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
          <div className="space-y-5 overflow-y-auto px-6 py-4">
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t("Presets")}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {PRESETS.map((preset) => {
                  const Icon = preset.icon;

                  return (
                    <Button
                      key={preset.id}
                      type="button"
                      variant="outline"
                      className="h-auto items-start justify-start gap-2 px-3 py-2 text-left"
                      onClick={() => void handlePreset(preset)}
                      disabled={generateText.isPending}
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                      <span className="space-y-0.5">
                        <span className="block text-sm font-medium">{t(preset.label)}</span>
                        <span className="block text-xs text-muted-foreground">
                          {t(preset.description)}
                        </span>
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t("Custom prompt")}</p>
              <Textarea
                value={customPrompt}
                onChange={(event) => setCustomPrompt(event.target.value)}
                placeholder={t("Example: Generate 3 fun caption options for this launch post")}
                rows={3}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => void handleCustomPrompt()}
                disabled={generateText.isPending || !customPrompt.trim()}
              >
                {generateText.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("Generating...")}
                  </>
                ) : (
                  t("Run custom prompt")
                )}
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">{t("Generated result")}</p>
              <Textarea
                value={generatedText}
                onChange={(event) => setGeneratedText(event.target.value)}
                placeholder={t("The generated text will appear here")}
                rows={8}
              />
            </div>
          </div>

          <SheetFooter className="border-t px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (!lastRequest) {
                  toast.error(t("Generate something first"));
                  return;
                }

                void runGeneration(lastRequest);
              }}
              disabled={generateText.isPending || !lastRequest}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("Regenerate")}
            </Button>
            <Button
              type="button"
              onClick={handleUseText}
              disabled={generateText.isPending || !generatedText.trim()}
            >
              <Check className="mr-2 h-4 w-4" />
              {t("Use this text")}
            </Button>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  );
}
