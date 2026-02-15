"use client";

import { useMemo, useState } from "react";
import { CredentialKind } from "@prisma/client";
import { toast } from "sonner";
import {
  useAccounts,
  useAccountsHealth,
  useConnectAccount,
  useCreateAccount,
  useDeleteAccount,
  useRevealAccountCredential,
  useUpdateAccount,
  type Account,
} from "@/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountAvatar } from "@/components/accounts";
import { PlatformIcon } from "@/components/shared/platform-icon";
import {
  getSemanticToneBadgeClassName,
  getSemanticToneTextClassName,
  type SemanticTone,
} from "@/lib/design-system/status";
import { PLATFORM_NAMES, type Platform } from "@/lib/platforms/types";
import {
  listProviderCatalogEntries,
  toProviderIdentifier,
} from "@/lib/providers/catalog";
import { translateErrorMessage } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/use-i18n";
import { cn } from "@/lib/utils";
import { Plus, Loader2, AlertCircle, Trash2, Pencil, ArrowLeft, CheckCircle2, Copy } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ExternalLink } from "lucide-react";

type PlatformInput = Platform;
type ConnectionMethod = "BYO_OAUTH" | "BYO_SYSTEM_USER" | "LATE";
type DialogStep = "channel" | "config";

const activeProviderEntries = listProviderCatalogEntries({ status: "active" });
const allProviderEntries = listProviderCatalogEntries({ status: "all" });

const platformOptions: PlatformInput[] = Array.from(
  new Set(activeProviderEntries.map((entry) => entry.platform)),
);

const comingSoonPlatforms: Platform[] = Array.from(
  new Set(
    allProviderEntries
      .filter(
        (entry) =>
          entry.status === "coming_soon" &&
          !platformOptions.includes(entry.platform),
      )
      .map((entry) => entry.platform),
  ),
);

const platformDescriptions: Record<PlatformInput, string> = activeProviderEntries.reduce(
  (accumulator, entry) => {
    if (!accumulator[entry.platform]) {
      accumulator[entry.platform] = entry.descriptionKey;
    }
    return accumulator;
  },
  {} as Record<PlatformInput, string>,
);

const connectionMethodOptions: Record<PlatformInput, ConnectionMethod[]> = platformOptions.reduce(
  (accumulator, platform) => {
    accumulator[platform] = activeProviderEntries
      .filter((entry) => entry.platform === platform)
      .map((entry) => entry.connectionMethod as ConnectionMethod);
    return accumulator;
  },
  {} as Record<PlatformInput, ConnectionMethod[]>,
);

const connectionMethodLabel: Record<ConnectionMethod, string> = {
  BYO_OAUTH: "BYO OAuth",
  BYO_SYSTEM_USER: "BYO System User",
  LATE: "Late",
};

function requiredCredentialKinds(method: ConnectionMethod): CredentialKind[] {
  if (method === "LATE") {
    return ["LATE_API_KEY"];
  }
  if (method === "BYO_SYSTEM_USER") {
    return ["SYSTEM_USER_TOKEN"];
  }
  return ["APP_ID", "APP_SECRET"];
}

function optionalCredentialKinds(method: ConnectionMethod): CredentialKind[] {
  if (method === "BYO_OAUTH") {
    return ["ACCESS_TOKEN", "REFRESH_TOKEN"];
  }
  return [];
}

function prettyCredentialKind(kind: CredentialKind) {
  if (kind === "SYSTEM_USER_TOKEN") {
    return "Token do usuário do sistema";
  }
  return kind.replaceAll("_", " ");
}

interface AccountFormState {
  platform: PlatformInput;
  connectionMethod: ConnectionMethod;
  providerIdentifier: string;
  handle: string;
  name: string;
  metaJson: string;
  credentials: Partial<Record<CredentialKind, string>>;
}

const defaultFormState: AccountFormState = {
  platform: "instagram",
  connectionMethod: "BYO_OAUTH",
  providerIdentifier: toProviderIdentifier("BYO_OAUTH", "instagram"),
  handle: "",
  name: "",
  metaJson: "",
  credentials: {},
};

interface InstagramAccount {
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  instagramId: string;
  username: string;
  name?: string;
  profilePictureUrl?: string;
}

const META_SETUP_STEPS = [
  {
    title: "1. Criar Aplicativo na Meta",
    content: "Crie um app do tipo 'Explorar' -> 'Empresa' (Business) no Meta for Developers.",
  },
  {
    title: "2. Configurar Redirect URI",
    content: "No produto 'Facebook Login for Business', adicione a URL de Callback abaixo.",
  },
  {
    title: "3. Adicionar Permissões",
    content: "Adicione as permissões: instagram_basic, instagram_content_publish, pages_show_list, pages_read_engagement.",
  },
];

export default function AccountsPage() {
  const { t } = useI18n();
  const successToneClassName = getSemanticToneTextClassName("success");
  const warningToneClassName = getSemanticToneTextClassName("warning");
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [dialogStep, setDialogStep] = useState<DialogStep>("channel");
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [form, setForm] = useState<AccountFormState>(defaultFormState);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({});
  const [copiedCallback, setCopiedCallback] = useState(false);

  const callbackUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/callback`;
  }, []);

  const copyCallback = () => {
    void navigator.clipboard.writeText(callbackUrl);
    setCopiedCallback(true);
    toast.success(t("URL de Callback copiada!"));
    setTimeout(() => setCopiedCallback(false), 2000);
  };

  // Instagram Validation State
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [availableInstagramAccounts, setAvailableInstagramAccounts] = useState<InstagramAccount[]>([]);
  const [selectedInstagramAccount, setSelectedInstagramAccount] = useState<string | null>(null);

  const { data: accountsData, isLoading } = useAccounts();
  const { data: healthData } = useAccountsHealth();

  const createMutation = useCreateAccount();
  const updateMutation = useUpdateAccount();
  const deleteMutation = useDeleteAccount();
  const revealMutation = useRevealAccountCredential();
  const connectMutation = useConnectAccount();
  const [connectingAccountId, setConnectingAccountId] = useState<string | null>(null);

  const accounts = (accountsData?.accounts || []) as Account[];
  const healthMap = useMemo(
    () =>
      new Map<string, any>(
        healthData?.accounts?.map((entry: any) => [entry.accountId, entry] as [string, any]) || [],
      ),
    [healthData],
  );

  const availableMethods =
    connectionMethodOptions[form.platform] ?? ["BYO_OAUTH", "BYO_SYSTEM_USER", "LATE"];
  const requiredKinds = requiredCredentialKinds(form.connectionMethod);
  const optionalKinds = optionalCredentialKinds(form.connectionMethod);
  const isMetaOAuthPlatform =
    form.platform === "instagram" ||
    form.platform === "facebook" ||
    form.platform === "threads";

  const resetFormDialog = () => {
    setShowFormDialog(false);
    setDialogStep("channel");
    setEditingAccount(null);
    setForm(defaultFormState);
    setAvailableInstagramAccounts([]);
    setSelectedInstagramAccount(null);
    setValidationError(null);
  };

  const openCreateDialog = () => {
    setEditingAccount(null);
    setForm(defaultFormState);
    setDialogStep("channel");
    setShowFormDialog(true);
  };

  const handleSelectChannel = (platform: PlatformInput) => {
    const firstMethod = connectionMethodOptions[platform][0];
    setForm((current) => ({
      ...current,
      platform,
      connectionMethod: firstMethod,
      providerIdentifier: toProviderIdentifier(firstMethod, platform),
    }));
    setDialogStep("config");
  };

  const openEditDialog = (account: Account) => {
    const accountPlatform = platformOptions.includes(account.platform as PlatformInput)
      ? (account.platform as PlatformInput)
      : "instagram";
    const accountMethod = connectionMethodOptions[accountPlatform].includes(account.connectionMethod)
      ? account.connectionMethod
      : connectionMethodOptions[accountPlatform][0];

    setEditingAccount(account);
    setForm({
      platform: accountPlatform,
      connectionMethod: accountMethod,
      providerIdentifier:
        account.providerIdentifier ||
        toProviderIdentifier(accountMethod, accountPlatform),
      handle: account.handle,
      name: account.name || "",
      metaJson: account.meta ? JSON.stringify(account.meta, null, 2) : "",
      credentials: {},
    });
    setDialogStep("config");
    setShowFormDialog(true);
  };

  const startOAuthConnection = async (account: Account) => {
    if (account.connectionMethod !== "BYO_OAUTH") {
      return;
    }

    try {
      setConnectingAccountId(account.id);
      const auth = await connectMutation.mutateAsync({
        platform: account.platform,
        providerIdentifier: account.providerIdentifier,
        profileId: account.profileId,
        providerType: "byo",
        socialAccountId: account.id,
      });

      window.location.href = auth.authUrl;
    } catch (error) {
      toast.error(translateErrorMessage(error, t, "Failed to start connection. Please try again."));
    } finally {
      setConnectingAccountId(null);
    }
  };

  const handleValidateInstagramToken = async () => {
    const token = form.credentials["SYSTEM_USER_TOKEN"];
    if (!token) {
      toast.error(t("Por favor, insira o token primeiro"));
      return;
    }

    setIsValidatingToken(true);
    setValidationError(null);
    setAvailableInstagramAccounts([]);

    try {
      const res = await fetch("/api/integrations/instagram/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to validate token");
      }

      const data = await res.json();
      if (data.accounts.length === 0) {
        setValidationError(t("Nenhuma conta comercial do Instagram encontrada conectada às páginas deste token."));
      } else {
        setAvailableInstagramAccounts(data.accounts);
      }
    } catch (error) {
      console.error(error);
      setValidationError(error instanceof Error ? error.message : "Validation failed");
    } finally {
      setIsValidatingToken(false);
    }
  };

  const handleSelectInstagramAccount = (accountId: string) => {
    const selected = availableInstagramAccounts.find((acc) => acc.instagramId === accountId);
    if (!selected) return;

    setSelectedInstagramAccount(accountId);

    // Automatically populate form fields
    setForm((current) => ({
      ...current,
      handle: selected.username,
      name: selected.name || selected.username,
      metaJson: JSON.stringify({
        igUserId: selected.instagramId,
        pageId: selected.pageId,
        pageName: selected.pageName,
        pageAccessToken: selected.pageAccessToken, // Ensure this is securely handled if needed
      }, null, 2),
    }));
  };

  const handleSaveAccount = async () => {
    if (!form.handle.trim() && form.connectionMethod !== "BYO_OAUTH") {
      toast.error(t("Handle is required"));
      return;
    }

    const nextMethods =
      connectionMethodOptions[form.platform] ?? ["BYO_OAUTH", "BYO_SYSTEM_USER", "LATE"];
    if (!nextMethods.includes(form.connectionMethod)) {
      toast.error(t("Invalid method for selected platform"));
      return;
    }

    let meta: Record<string, unknown> | null = null;
    if (form.metaJson.trim()) {
      try {
        const parsed = JSON.parse(form.metaJson);
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error(t("Meta JSON must be an object"));
        }
        meta = parsed as Record<string, unknown>;
      } catch (error) {
        toast.error(translateErrorMessage(error, t, "Invalid meta JSON"));
        return;
      }
    }

    const credentialsPayload = requiredKinds
      .map((kind) => ({ kind, value: form.credentials[kind]?.trim() || "" }))
      .filter((entry) => entry.value.length > 0);
    const optionalCredentialsPayload = optionalKinds
      .map((kind) => ({ kind, value: form.credentials[kind]?.trim() || "" }))
      .filter((entry) => entry.value.length > 0);

    if (!editingAccount) {
      const missing = requiredKinds.filter(
        (kind) => !credentialsPayload.find((entry) => entry.kind === kind),
      );

      if (missing.length > 0) {
        toast.error(
          t("Missing credentials: {credentials}", {
            credentials: missing.map(prettyCredentialKind).join(", "),
          }),
        );
        return;
      }
    }

    try {
      if (editingAccount) {
        await updateMutation.mutateAsync({
          accountId: editingAccount.id,
          providerIdentifier: form.providerIdentifier,
          platform: form.platform,
          connectionMethod: form.connectionMethod,
          handle: form.handle,
          name: form.name.trim() ? form.name.trim() : null,
          meta,
          credentials: [...credentialsPayload, ...optionalCredentialsPayload],
        });
        toast.success(t("Account updated"));
      } else {
        const response = await createMutation.mutateAsync({
          providerIdentifier: form.providerIdentifier,
          platform: form.platform,
          connectionMethod: form.connectionMethod,
          handle: form.handle,
          name: form.name.trim() ? form.name.trim() : null,
          meta,
          credentials: [...credentialsPayload, ...optionalCredentialsPayload],
        });

        if (form.connectionMethod === "BYO_OAUTH" && response?.account?.id) {
          toast.success(t("Account created. Redirecting to provider..."));
          await startOAuthConnection(response.account as Account);
          return;
        }

        toast.success(t("Account created"));
      }

      resetFormDialog();
    } catch (error) {
      toast.error(translateErrorMessage(error, t, "Failed to save account"));
    }
  };

  const handleDelete = async () => {
    if (!accountToDelete) return;

    try {
      await deleteMutation.mutateAsync(accountToDelete);
      toast.success(t("Account deleted"));
      setAccountToDelete(null);
    } catch (error) {
      toast.error(translateErrorMessage(error, t, "Failed to delete account"));
    }
  };

  const handleReveal = async (accountId: string, kind: CredentialKind) => {
    try {
      const data = await revealMutation.mutateAsync({ accountId, kind });
      setRevealedSecrets((current) => ({
        ...current,
        [`${accountId}:${kind}`]: data.value,
      }));
      toast.success(t("Credential revealed once"));
    } catch (error) {
      toast.error(translateErrorMessage(error, t, "Failed to reveal credential"));
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">{t("Accounts")}</h1>
        <p className="text-muted-foreground">
          {t("Configure per-account connectors and credentials.")}
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-base">{t("Connected Accounts")}</CardTitle>
            <CardDescription>
              {accounts.length}{" "}
              {accounts.length === 1 ? t("account") : t("accounts")}{" "}
              {t("configured")}
            </CardDescription>
          </div>
          <Button size="sm" onClick={openCreateDialog}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("Add Account")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <div className="rounded-lg bg-muted p-6 text-center text-sm text-muted-foreground">
              {t("No accounts configured yet.")}
            </div>
          ) : (
            accounts.map((account) => {
              const health = healthMap.get(account.id);
              const statusTone: SemanticTone =
                account.status === "CONNECTED"
                  ? "success"
                  : account.status === "DISCONNECTED"
                    ? "warning"
                    : account.status === "ERROR"
                      ? "danger"
                      : "neutral";

              const statusLabel = t(account.status);

              return (
                <div key={account.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <AccountAvatar account={account} size="sm" />
                      <div>
                        <p className="text-sm font-medium">{account.name || account.handle}</p>
                        <p className="text-xs text-muted-foreground">@{account.handle}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{PLATFORM_NAMES[account.platform]}</Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "border",
                          getSemanticToneBadgeClassName(statusTone),
                        )}
                      >
                        {statusLabel}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(account)}
                      >
                        <Pencil className="mr-1.5 h-3 w-3" />
                        {t("Edit")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setAccountToDelete(account.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="outline">{t(connectionMethodLabel[account.connectionMethod])}</Badge>
                    {health?.status === "needs_reconnect" && (
                      <span className={cn("flex items-center gap-1", warningToneClassName)}>
                        <AlertCircle className="h-3 w-3" /> {t("Needs reconnect")}
                      </span>
                    )}

                    {/* OAuth reconnect button for BYO accounts not connected */}
                    {account.connectionMethod === "BYO_OAUTH" && account.status !== "CONNECTED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "h-7 border transition-[filter] hover:brightness-95",
                          getSemanticToneBadgeClassName("info"),
                        )}
                        onClick={() => void startOAuthConnection(account)}
                        disabled={connectingAccountId === account.id}
                      >
                        {connectingAccountId === account.id ? (
                          <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                        ) : null}
                        {t("Connect Account")}
                      </Button>
                    )}

                    {account.connectionMethod === "BYO_OAUTH" && account.status !== "CONNECTED" && (
                      <div className="flex items-center gap-2 rounded-md bg-muted px-2 py-1 text-[10px] text-muted-foreground border border-dashed">
                        <span>Callback: {callbackUrl}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 hover:text-primary"
                          onClick={copyCallback}
                        >
                          {copiedCallback ? (
                            <CheckCircle2 className={cn("h-3 w-3", successToneClassName)} />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 rounded-md bg-muted/60 p-3">
                    <p className="text-xs font-medium text-muted-foreground">{t("Credentials")}</p>
                    {account.credentials && account.credentials.length > 0 ? (
                      account.credentials
                        .filter((credential) => credential.kind)
                        .map((credential) => {
                          const key = `${account.id}:${credential.kind}`;

                          return (
                            <div
                              key={key}
                              className="flex items-center justify-between rounded bg-background px-3 py-2"
                            >
                              <div>
                                <p className="text-xs font-medium">{prettyCredentialKind(credential.kind!)}</p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {credential.maskedValue || t("Not set")}
                                </p>
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <p className="text-xs text-muted-foreground">{t("No credentials saved.")}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Dialog
        open={showFormDialog}
        onOpenChange={(open) => {
          if (!open) {
            resetFormDialog();
            return;
          }
          setShowFormDialog(true);
        }}
      >
        <DialogContent
          className={cn(
            "max-h-[90vh] overflow-y-auto",
            !editingAccount && dialogStep === "channel" ? "max-w-5xl" : "max-w-2xl",
          )}
        >
          <DialogHeader>
            <DialogTitle>
              {editingAccount
                ? t("Edit Account")
                : dialogStep === "channel"
                  ? t("Add Channel")
                  : t("Configure {platform}", { platform: PLATFORM_NAMES[form.platform] })}
            </DialogTitle>
            <DialogDescription>
              {editingAccount || dialogStep === "config"
                ? t("Configure network, connection method and encrypted credentials.")
                : t("Choose the channel icon first, then continue with connection details.")}
            </DialogDescription>
          </DialogHeader>

          {!editingAccount && dialogStep === "channel" ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {platformOptions.map((platform) => (
                  <Button
                    key={platform}
                    type="button"
                    variant="ghost"
                    onClick={() => handleSelectChannel(platform)}
                    className="group h-auto w-full flex-col items-start justify-start whitespace-normal rounded-xl border border-border/70 bg-gradient-to-b from-muted/40 to-background p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-background/80">
                      <PlatformIcon platform={platform} showColor size="xl" />
                    </div>
                    <p className="mt-3 w-full break-words text-sm font-semibold">
                      {PLATFORM_NAMES[platform]}
                    </p>
                    <p className="mt-1 w-full break-words text-xs text-muted-foreground">
                      {t(platformDescriptions[platform])}
                    </p>
                  </Button>
                ))}
              </div>

              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("More channels soon")}
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {comingSoonPlatforms.map((platform) => (
                    <div
                      key={platform}
                      className="rounded-xl border border-dashed border-border/70 bg-muted/40 p-4 opacity-75"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/60">
                        <PlatformIcon platform={platform} showColor size="lg" />
                      </div>
                      <p className="mt-3 text-sm font-medium">{PLATFORM_NAMES[platform]}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{t("Coming soon")}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {!editingAccount && (
                <div className="rounded-xl border bg-muted/30 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border bg-background">
                        <PlatformIcon platform={form.platform} showColor size="lg" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{PLATFORM_NAMES[form.platform]}</p>
                        <p className="text-xs text-muted-foreground">
                          {t(platformDescriptions[form.platform])}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDialogStep("channel")}
                    >
                      <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                      {t("Change channel")}
                    </Button>
                  </div>
                </div>
              )}

              <div className={cn("grid grid-cols-1 gap-3", editingAccount ? "sm:grid-cols-2" : "")}>
                {editingAccount && (
                  <div className="space-y-2">
                    <Label>{t("Platform")}</Label>
                    <Select
                      value={form.platform}
                      onValueChange={(value: PlatformInput) => {
                        const firstMethod = connectionMethodOptions[value][0];
                        setForm((current) => ({
                          ...current,
                          platform: value,
                          connectionMethod: connectionMethodOptions[value].includes(current.connectionMethod)
                            ? current.connectionMethod
                            : firstMethod,
                          providerIdentifier: toProviderIdentifier(
                            connectionMethodOptions[value].includes(current.connectionMethod)
                              ? current.connectionMethod
                              : firstMethod,
                            value,
                          ),
                          credentials: {}, // reset credentials on platform change
                        }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {platformOptions.map((platform) => (
                          <SelectItem key={platform} value={platform}>
                            {PLATFORM_NAMES[platform]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>{t("Método de Conexão")}</Label>
                  <Select
                    value={form.connectionMethod}
                    onValueChange={(value: ConnectionMethod) =>
                      setForm((current) => ({
                        ...current,
                        connectionMethod: value,
                        providerIdentifier: toProviderIdentifier(value, current.platform),
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMethods.map((method) => (
                        <SelectItem key={method} value={method}>
                          {t(connectionMethodLabel[method])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Show Validation UI for Instagram System User Token */}
              {form.platform === "instagram" && form.connectionMethod === "BYO_SYSTEM_USER" ? (
                <div className="space-y-4 rounded-md border p-4">
                  <h3 className="text-sm font-medium">{t("Passo 1: Insira o Token de Usuário do Sistema")}</h3>
                  <div className="space-y-2">
                    <Label htmlFor="sys-token">{t("Token de Usuário do Sistema")}</Label>
                    <div className="flex gap-2">
                      <Input
                        id="sys-token"
                        type="password"
                        value={form.credentials["SYSTEM_USER_TOKEN"] || ""}
                        onChange={(e) => setForm(curr => ({
                          ...curr,
                          credentials: { ...curr.credentials, "SYSTEM_USER_TOKEN": e.target.value }
                        }))}
                        placeholder={t("Insira o token começando com EAA...")}
                      />
                      <Button
                        type="button"
                        onClick={handleValidateInstagramToken}
                        disabled={isValidatingToken || !form.credentials["SYSTEM_USER_TOKEN"]}
                      >
                        {isValidatingToken ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Validar")}
                      </Button>
                    </div>
                    {validationError && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> {validationError}
                      </p>
                    )}
                  </div>

                  {availableInstagramAccounts.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        {t("Passo 2: Selecione a Conta do Instagram")}
                        <Badge variant="secondary" className="text-[10px]">{availableInstagramAccounts.length} encontradas</Badge>
                      </h3>
                      <RadioGroup value={selectedInstagramAccount || ""} onValueChange={handleSelectInstagramAccount}>
                        {availableInstagramAccounts.map((acc) => (
                          <div key={acc.instagramId} className={cn(
                            "flex items-start space-x-3 rounded-md border p-3 transition-colors",
                            selectedInstagramAccount === acc.instagramId ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                          )}>
                            <RadioGroupItem value={acc.instagramId} id={acc.instagramId} className="mt-1" />
                            <Label htmlFor={acc.instagramId} className="flex-1 cursor-pointer font-normal">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border">
                                  <AvatarImage src={acc.profilePictureUrl} />
                                  <AvatarFallback>{acc.username[0].toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="space-y-0.5">
                                  <p className="font-medium leading-none">{acc.name || acc.username}</p>
                                  <p className="text-xs text-muted-foreground">@{acc.username}</p>
                                  <p className="text-[10px] text-muted-foreground mt-1">Conectado à Página: {acc.pageName}</p>
                                </div>
                              </div>
                            </Label>
                            {selectedInstagramAccount === acc.instagramId && (
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            )}
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {form.connectionMethod !== "BYO_OAUTH" && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="handle">{t("Usuário (Handle)")}</Label>
                        <Input
                          id="handle"
                          value={form.handle}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, handle: event.target.value }))
                          }
                          placeholder={t("@marca")}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="name">{t("Nome")}</Label>
                        <Input
                          id="name"
                          value={form.name}
                          onChange={(event) =>
                            setForm((current) => ({ ...current, name: event.target.value }))
                          }
                          placeholder={t("Conta da Marca")}
                        />
                      </div>
                    </div>
                  )}

                  {form.connectionMethod !== "BYO_OAUTH" && (
                    <div className="space-y-2">
                      <Label htmlFor="meta-json">{t("Meta Dados (JSON)")}</Label>
                      <Textarea
                        id="meta-json"
                        rows={4}
                        value={form.metaJson}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, metaJson: event.target.value }))
                        }
                        placeholder='{"pageId":"...","igUserId":"..."}'
                      />
                    </div>
                  )}

                  {form.connectionMethod === "BYO_OAUTH" && (
                    <div className="space-y-4 rounded-xl border bg-primary/5 p-4 border-primary/20">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold uppercase tracking-wider text-primary">
                            {t("URL de Redirecionamento (Callback)")}
                          </Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[10px]"
                            onClick={copyCallback}
                          >
                            {copiedCallback ? (
                              <CheckCircle2 className={cn("mr-1 h-3 w-3", successToneClassName)} />
                            ) : (
                              <Copy className="mr-1 h-3 w-3" />
                            )}
                            {copiedCallback ? t("Copiado") : t("Copiar")}
                          </Button>
                        </div>
                        <Input
                          readOnly
                          value={callbackUrl}
                          className="bg-background/50 font-mono text-[11px]"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          {isMetaOAuthPlatform
                            ? t("Use esta URL no campo 'Valid OAuth Redirect URIs' nas configurações do seu App na Meta.")
                            : t("Use this callback URL in your OAuth app redirect settings.")}
                        </p>
                      </div>

                      {isMetaOAuthPlatform ? (
                        <Accordion type="single" collapsible className="w-full">
                          <AccordionItem value="guide" className="border-none">
                            <AccordionTrigger className="py-2 text-xs font-medium hover:no-underline text-primary/80">
                              {t("Como configurar na Meta? (Passo a passo)")}
                            </AccordionTrigger>
                            <AccordionContent className="pt-2">
                              <div className="space-y-3">
                                {META_SETUP_STEPS.map((step, idx) => (
                                  <div key={idx} className="space-y-1">
                                    <p className="text-[11px] font-bold text-foreground">{step.title}</p>
                                    <p className="text-[11px] leading-relaxed text-muted-foreground">{step.content}</p>
                                  </div>
                                ))}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full mt-2 h-8 text-[11px]"
                                  asChild
                                >
                                  <a
                                    href="https://developers.facebook.com/apps/"
                                    target="_blank"
                                    rel="noreferrer"
                                  >
                                    {t("Abrir Meta for Developers")}
                                    <ExternalLink className="ml-1.5 h-3 w-3" />
                                  </a>
                                </Button>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        </Accordion>
                      ) : null}
                    </div>
                  )}

                  <div className="space-y-3 rounded-md border p-3">
                    <p className="text-sm font-medium">{t("Credenciais (Criptografadas)")}</p>
                    {requiredKinds.map((kind) => (
                      <div key={kind} className="space-y-2">
                        <Label htmlFor={`credential-${kind}`}>{prettyCredentialKind(kind)}</Label>
                        <Input
                          id={`credential-${kind}`}
                          type="password"
                          value={form.credentials[kind] || ""}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              credentials: {
                                ...current.credentials,
                                [kind]: event.target.value,
                              },
                            }))
                          }
                          placeholder={
                            editingAccount
                              ? t("Deixe em branco para manter o valor atual")
                              : t("Insira o valor")
                          }
                        />
                      </div>
                    ))}
                    {/* Optional credentials hidden for BYO OAuth to simplify */}
                    {form.connectionMethod !== "BYO_OAUTH" && optionalKinds.map((kind) => (
                      <div key={kind} className="space-y-2">
                        <Label htmlFor={`credential-optional-${kind}`}>
                          {t("{credential} (opcional)", { credential: prettyCredentialKind(kind) })}
                        </Label>
                        <Input
                          id={`credential-optional-${kind}`}
                          type="password"
                          value={form.credentials[kind] || ""}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              credentials: {
                                ...current.credentials,
                                [kind]: event.target.value,
                              },
                            }))
                          }
                          placeholder={t("Opcional")}
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}

              <Button
                className="w-full"
                onClick={handleSaveAccount}
                disabled={createMutation.isPending || updateMutation.isPending || (form.platform === 'instagram' && form.connectionMethod === 'BYO_SYSTEM_USER' && !selectedInstagramAccount)}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {form.connectionMethod === "BYO_OAUTH" && !editingAccount ? t("Create and Connect") : t("Save")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!accountToDelete} onOpenChange={() => setAccountToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Delete account")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("This removes the account and its credentials from this workspace.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
