"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Info, Type } from "lucide-react";
import { StatusBadge } from "@/components/shared";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getPostStatusTone,
  getSemanticToneBadgeClassName,
  getSemanticToneSurfaceClassName,
  getSemanticToneTextClassName,
  type PostUiStatus,
  type SemanticTone,
} from "@/lib/design-system/status";
import { useI18n } from "@/lib/i18n/use-i18n";
import { cn } from "@/lib/utils";

interface ToneToken {
  tone: SemanticTone;
  title: string;
  bgVar: string;
  fgVar: string;
  borderVar: string;
}

const toneTokens: ToneToken[] = [
  {
    tone: "info",
    title: "Info",
    bgVar: "--status-info-bg",
    fgVar: "--status-info-fg",
    borderVar: "--status-info-border",
  },
  {
    tone: "success",
    title: "Success",
    bgVar: "--status-success-bg",
    fgVar: "--status-success-fg",
    borderVar: "--status-success-border",
  },
  {
    tone: "warning",
    title: "Warning",
    bgVar: "--status-warning-bg",
    fgVar: "--status-warning-fg",
    borderVar: "--status-warning-border",
  },
  {
    tone: "danger",
    title: "Danger",
    bgVar: "--status-danger-bg",
    fgVar: "--status-danger-fg",
    borderVar: "--status-danger-border",
  },
  {
    tone: "neutral",
    title: "Neutral",
    bgVar: "--status-neutral-bg",
    fgVar: "--status-neutral-fg",
    borderVar: "--status-neutral-border",
  },
];

const radiusScale = [
  "--radius-sm",
  "--radius-md",
  "--radius-lg",
  "--radius-xl",
  "--radius-2xl",
] as const;

const statusSamples: Array<{ status: PostUiStatus; description: string }> = [
  { status: "draft", description: "Draft not scheduled yet." },
  { status: "scheduled", description: "Scheduled post queued for the next slot." },
  { status: "publishing", description: "Publishing in progress." },
  { status: "published", description: "Last publish completed successfully." },
  { status: "failed", description: "Publish failed. Retry is available." },
];

function TokenSwatch({ label, token }: { label: string; token: string }) {
  return (
    <div className="space-y-1">
      <div
        className="h-10 rounded-md border"
        style={{ backgroundColor: `var(${token})` }}
      />
      <p className="text-[11px] font-medium">{label}</p>
      <p className="text-[10px] text-muted-foreground font-mono">{token}</p>
    </div>
  );
}

export default function DesignSystemPage() {
  const { t } = useI18n();
  const [sampleSelect, setSampleSelect] = useState("option-a");

  return (
    <div className="mx-auto max-w-5xl space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">{t("Design System")}</h1>
        <p className="text-muted-foreground">
          {t("Design token catalog and live component previews.")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("Status tokens")}</CardTitle>
          <CardDescription>
            {t("Semantic tone tokens used across dashboard and shared components.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {toneTokens.map((token) => (
            <div key={token.tone} className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{t(token.title)}</p>
                  <p className="text-xs text-muted-foreground">{t("Tone")}</p>
                </div>
                <Badge
                  variant="outline"
                  className={cn("border", getSemanticToneBadgeClassName(token.tone))}
                >
                  {t(token.title)}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <TokenSwatch label={t("Background")} token={token.bgVar} />
                <TokenSwatch label={t("Foreground")} token={token.fgVar} />
                <TokenSwatch label={t("Border")} token={token.borderVar} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("Typography and radius")}</CardTitle>
          <CardDescription>
            {t("These primitives define spacing rhythm, readability and shape.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">{t("Sample text")}</p>
            <p className="mt-2 text-base">
              {t("Body text example with the current font stack and contrast tokens.")}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t("Radius scale")}</p>
            <div className="flex flex-wrap gap-3">
              {radiusScale.map((token) => (
                <div key={token} className="space-y-1 text-center">
                  <div
                    className="h-10 w-16 border bg-card"
                    style={{ borderRadius: `var(${token})` }}
                  />
                  <p className="text-[10px] text-muted-foreground font-mono">{token}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("Component gallery")}</CardTitle>
          <CardDescription>
            {t("Components consume design tokens directly. Any token change propagates here and across the app.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium">{t("Buttons and badges")}</p>
            <div className="flex flex-wrap gap-2">
              <Button>{t("Primary Action")}</Button>
              <Button variant="secondary">{t("Secondary Action")}</Button>
              <Button variant="ghost">{t("Ghost Action")}</Button>
              <Badge variant="outline">{t("Label")}</Badge>
            </div>
          </div>

          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm font-medium">{t("Form controls")}</p>
            <Input placeholder={t("Input placeholder")} />
            <Textarea placeholder={t("Textarea placeholder")} />
            <Select value={sampleSelect} onValueChange={setSampleSelect}>
              <SelectTrigger>
                <SelectValue placeholder={t("Select sample")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="option-a">{t("Select option A")}</SelectItem>
                <SelectItem value="option-b">{t("Select option B")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Alert className={cn("border", getSemanticToneSurfaceClassName("info"))}>
            <Info className={getSemanticToneTextClassName("info")} />
            <AlertTitle>{t("Info alert title")}</AlertTitle>
            <AlertDescription>
              {t("Use semantic tokens for informational feedback.")}
            </AlertDescription>
          </Alert>

          <Alert className={cn("border", getSemanticToneSurfaceClassName("warning"))}>
            <AlertCircle className={getSemanticToneTextClassName("warning")} />
            <AlertTitle>{t("Warning alert title")}</AlertTitle>
            <AlertDescription>
              {t("Use warning tone for reconnect and attention-required flows.")}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("Live status states")}</CardTitle>
          <CardDescription>
            {t("Status mapping from domain state to semantic tone.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {statusSamples.map(({ status, description }) => {
            const tone = getPostStatusTone(status);
            return (
              <div
                key={status}
                className={cn("rounded-lg border p-3", getSemanticToneSurfaceClassName(tone))}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {status === "published" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : status === "failed" ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : status === "scheduled" ? (
                      <Info className="h-4 w-4" />
                    ) : status === "publishing" ? (
                      <Type className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <p className="text-sm">{t(description)}</p>
                  </div>
                  <StatusBadge status={status} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
