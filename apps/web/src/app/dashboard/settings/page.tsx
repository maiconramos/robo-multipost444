"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useSession, signOut } from "@/lib/auth/client";
import { useAppStore } from "@/stores/app-store";
import { SUPPORTED_LOCALES, translateErrorMessage } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/use-i18n";
import {
  AI_IMAGE_MODEL_OPTIONS,
  AI_TEXT_MODEL_OPTIONS,
  DEFAULT_AI_IMAGE_MODEL,
  DEFAULT_AI_TEXT_MODEL,
} from "@/lib/ai/types";
import { getTimezoneOptions } from "@/lib/timezones";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "sonner";
import { Moon, Sun, Globe, LogOut, User, Sparkles, Clock, Copy, Check } from "lucide-react";
import { ApiKeysCard } from "./_components/api-keys-card";
import { StorageCard } from "./_components/storage-card";

type CredentialMetadata = Record<string, unknown> | null | undefined;

function getMetadataString(metadata: CredentialMetadata, key: string): string | undefined {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return undefined;
  }

  const value = metadata[key];
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();
  const { timezone, setTimezone, language, setLanguage } = useAppStore();
  const { t } = useI18n();

  const [aiApiKey, setAiApiKey] = useState("");
  const [hasAICredential, setHasAICredential] = useState(false);
  const [aiTextModel, setAiTextModel] = useState(DEFAULT_AI_TEXT_MODEL);
  const [aiImageModel, setAiImageModel] = useState(DEFAULT_AI_IMAGE_MODEL);
  const [loading, setLoading] = useState(true);
  const [savingAIConfig, setSavingAIConfig] = useState(false);
  const [testingAIConnection, setTestingAIConnection] = useState(false);
  const [cronSecret, setCronSecret] = useState<string | null>(null);
  const [copiedCron, setCopiedCron] = useState(false);

  const timezoneOptions = useMemo(() => getTimezoneOptions(timezone), [timezone]);

  const loadAIConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/credentials");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load settings");
      }

      const credentials = (data.credentials || []) as Array<{
        type: string;
        metadata?: CredentialMetadata;
      }>;

      const aiCredential = credentials.find((c) => c.type === "ai_api_key");
      const textModelFromMetadata = getMetadataString(aiCredential?.metadata, "textModel");
      const imageModelFromMetadata = getMetadataString(aiCredential?.metadata, "imageModel");
      const textModel =
        textModelFromMetadata &&
          AI_TEXT_MODEL_OPTIONS.includes(textModelFromMetadata as (typeof AI_TEXT_MODEL_OPTIONS)[number])
          ? textModelFromMetadata
          : DEFAULT_AI_TEXT_MODEL;
      const imageModel =
        imageModelFromMetadata &&
          AI_IMAGE_MODEL_OPTIONS.includes(imageModelFromMetadata as (typeof AI_IMAGE_MODEL_OPTIONS)[number])
          ? imageModelFromMetadata
          : DEFAULT_AI_IMAGE_MODEL;

      setHasAICredential(Boolean(aiCredential));
      setAiTextModel(textModel);
      setAiImageModel(imageModel);
    } catch (error) {
      toast.error(translateErrorMessage(error, t, "Failed to load settings"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  const loadCronSecret = useCallback(async () => {
    try {
      const res = await fetch("/api/system/cron-info");
      const data = await res.json();
      if (res.ok) {
        setCronSecret(data.cronSecret);
      }
    } catch (error) {
      console.error("Failed to load cron secret", error);
    }
  }, []);

  useEffect(() => {
    void loadAIConfig();
    void loadCronSecret();
  }, [loadAIConfig, loadCronSecret]);

  const saveAIConfiguration = async () => {
    if (!aiApiKey.trim() && !hasAICredential) {
      toast.error(t("Enter an OpenRouter API key first"));
      return;
    }

    setSavingAIConfig(true);
    try {
      const payload: {
        type: string;
        value?: string;
        metadata: {
          provider: string;
          textModel: string;
          imageModel: string;
        };
      } = {
        type: "ai_api_key",
        metadata: {
          provider: "openrouter",
          textModel: aiTextModel,
          imageModel: aiImageModel,
        },
      };

      if (aiApiKey.trim()) {
        payload.value = aiApiKey.trim();
      }

      const response = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Failed to save AI configuration");
      }

      setAiApiKey("");
      toast.success(t("AI configuration saved"));
      await loadAIConfig();
    } catch (error) {
      toast.error(translateErrorMessage(error, t, "Failed to save AI configuration"));
    } finally {
      setSavingAIConfig(false);
    }
  };

  const testAIConnection = async () => {
    if (!hasAICredential) {
      toast.error(t("Save an OpenRouter API key before testing"));
      return;
    }

    setTestingAIConnection(true);
    try {
      const response = await fetch("/api/ai/generate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: "Reply with exactly: Connection OK",
          maxTokens: 64,
          temperature: 0,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Failed to test AI connection");
      }

      toast.success(t("AI connection successful ({model})", { model: data.model || "model" }));
    } catch (error) {
      toast.error(translateErrorMessage(error, t, "Failed to test AI connection"));
    } finally {
      setTestingAIConnection(false);
    }
  };

  const removeAIApiKey = async () => {
    setSavingAIConfig(true);
    try {
      const response = await fetch("/api/credentials?type=ai_api_key", {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to remove OpenRouter API key");
      }

      setHasAICredential(false);
      setAiApiKey("");
      toast.success(t("OpenRouter API key removed"));
      await loadAIConfig();
    } catch (error) {
      toast.error(translateErrorMessage(error, t, "Failed to remove OpenRouter API key"));
    } finally {
      setSavingAIConfig(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedCron(true);
    toast.success(t("Copied to clipboard"));
    setTimeout(() => setCopiedCron(false), 2000);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">{t("Settings")}</h1>
        <p className="text-muted-foreground">{t("Manage your account and preferences.")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" />
            {t("Account")}
          </CardTitle>
          <CardDescription>{t("Your account information.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{t("Name")}</span>
            <span className="text-sm font-medium">{session?.user.name || "—"}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{t("Email")}</span>
            <span className="text-sm font-medium">{session?.user.email || "—"}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            {t("Appearance")}
          </CardTitle>
          <CardDescription>{t("Customize how the app looks on your device.")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("Theme")}</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t("Light")}</SelectItem>
                <SelectItem value="dark">{t("Dark")}</SelectItem>
                <SelectItem value="system">{t("System")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("Language")}</Label>
            <Select value={language} onValueChange={(value) => setLanguage(value as (typeof SUPPORTED_LOCALES)[number])}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_LOCALES.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option === "pt-BR" ? t("Português (Brasil)") : t("English")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-4 w-4" />
            {t("Timezone")}
          </CardTitle>
          <CardDescription>{t("Set your default timezone for scheduling posts.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>{t("Default Timezone")}</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timezoneOptions.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t("Current timezone: {timezone}", {
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" />
            {t("AI Configuration")}
          </CardTitle>
          <CardDescription>
            {t("Configure OpenRouter credentials and default models for text and image generation.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ai-api-key">{t("OpenRouter API Key")}</Label>
            <Input
              id="ai-api-key"
              type="password"
              value={aiApiKey}
              onChange={(event) => setAiApiKey(event.target.value)}
              placeholder="sk-or-..."
              disabled={loading || savingAIConfig}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {t("Status: {status}", {
                  status: hasAICredential ? t("Configured") : t("Not configured"),
                })}
              </p>
              {hasAICredential && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={removeAIApiKey}
                  disabled={loading || savingAIConfig}
                >
                  {t("Remove Key")}
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("Default text model")}</Label>
              <Select
                value={aiTextModel}
                onValueChange={setAiTextModel}
                disabled={loading || savingAIConfig}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_TEXT_MODEL_OPTIONS.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("Default image model")}</Label>
              <Select
                value={aiImageModel}
                onValueChange={setAiImageModel}
                disabled={loading || savingAIConfig}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_IMAGE_MODEL_OPTIONS.map((model) => (
                    <SelectItem key={model} value={model}>
                      {model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={saveAIConfiguration} disabled={loading || savingAIConfig}>
              {t("Save AI Config")}
            </Button>
            <Button
              variant="outline"
              onClick={testAIConnection}
              disabled={loading || testingAIConnection || !hasAICredential}
            >
              {testingAIConnection ? t("Testing...") : t("Test Connection")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <ApiKeysCard />
      <StorageCard />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            {t("Cron Configuration")}
          </CardTitle>
          <CardDescription>
            {t("Use this secret to authenticate your Vercel Cron Jobs.")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("Cron Secret")}</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={cronSecret || t("Loading...")}
                type="text"
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => cronSecret && copyToClipboard(cronSecret)}
                disabled={!cronSecret}
              >
                {copiedCron ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground leading-tight">
              {t("In your Vercel Dashboard, create a CRON_SECRET environment variable with this value or use it in the Authorization header as Bearer token.")}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LogOut className="h-4 w-4" />
            {t("Session")}
          </CardTitle>
          <CardDescription>{t("Manage your current session on this device.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">{t("Sign Out")}</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("Sign Out")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("You will be signed out and redirected to the home page. You can sign in again at any time.")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout}>{t("Sign Out")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
