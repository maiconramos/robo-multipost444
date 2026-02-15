"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, ImagePlus, Wand2, RefreshCw, Check } from "lucide-react";
import type { AIAspectRatio, AIImageStyle, GenerateImageResult } from "@/lib/ai/types";
import { useGenerateImage } from "@/hooks";
import { translateErrorMessage } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/use-i18n";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AIImageGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseImage: (image: GenerateImageResult) => Promise<void> | void;
}

const STYLE_OPTIONS: Array<{ value: AIImageStyle; label: string }> = [
  { value: "realistic", label: "Realistic" },
  { value: "cartoon", label: "Cartoon" },
  { value: "minimalist", label: "Minimalist" },
  { value: "artistic", label: "Artistic" },
  { value: "photographic", label: "Photographic" },
];

const ASPECT_RATIOS: AIAspectRatio[] = ["1:1", "4:5", "16:9", "9:16"];

export function AIImageGenerator({
  open,
  onOpenChange,
  onUseImage,
}: AIImageGeneratorProps) {
  const { t } = useI18n();
  const generateImage = useGenerateImage();
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<AIImageStyle>("realistic");
  const [aspectRatio, setAspectRatio] = useState<AIAspectRatio>("1:1");
  const [generated, setGenerated] = useState<GenerateImageResult | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  const handleGenerate = async () => {
    const value = prompt.trim();
    if (!value) {
      toast.error(t("Describe the image you want to generate"));
      return;
    }

    try {
      const result = await generateImage.mutateAsync({
        prompt: value,
        style,
        aspectRatio,
      });
      setGenerated(result);
    } catch (error) {
      toast.error(translateErrorMessage(error, t, "Failed to generate image"));
    }
  };

  const handleUseImage = async () => {
    if (!generated) {
      return;
    }

    try {
      setIsApplying(true);
      await onUseImage(generated);
      toast.success(t("Generated image added to post"));
      onOpenChange(false);
    } catch (error) {
      toast.error(translateErrorMessage(error, t, "Failed to use generated image"));
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImagePlus className="h-4 w-4" />
            {t("AI Image Generator")}
          </DialogTitle>
          <DialogDescription>
            {t("Describe the image, pick a style, and add the generated media to this post.")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ai-image-prompt">{t("Prompt")}</Label>
            <Input
              id="ai-image-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder={t("Example: Product shot of a coffee mug on a wooden desk, warm morning light")}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("Style")}</Label>
              <Select
                value={style}
                onValueChange={(value) => setStyle(value as AIImageStyle)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STYLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {t(option.label)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("Aspect ratio")}</Label>
              <div className="grid grid-cols-4 gap-2">
                {ASPECT_RATIOS.map((ratio) => (
                  <Button
                    key={ratio}
                    type="button"
                    variant={aspectRatio === ratio ? "default" : "outline"}
                    className="px-0"
                    onClick={() => setAspectRatio(ratio)}
                  >
                    {ratio}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <Button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={generateImage.isPending || !prompt.trim()}
          >
            {generateImage.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("Generating...")}
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                {t("Generate image")}
              </>
            )}
          </Button>

          {generated && (
            <div className="space-y-2 rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">{t("Generated preview")}</p>
              <img
                src={generated.imageUrl}
                alt={t("AI generated preview")}
                className="max-h-[360px] w-full rounded-md object-contain"
              />
              <p className="text-xs text-muted-foreground">
                {t("Model: {model}", { model: generated.model })}
              </p>
              {generated.revisedPrompt && (
                <p className="text-xs text-muted-foreground">
                  {t("Prompt notes: {notes}", { notes: generated.revisedPrompt })}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleGenerate()}
            disabled={generateImage.isPending || !prompt.trim()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("Regenerate")}
          </Button>
          <Button
            type="button"
            onClick={() => void handleUseImage()}
            disabled={!generated || isApplying}
          >
            {isApplying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("Adding...")}
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                {t("Use image")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
