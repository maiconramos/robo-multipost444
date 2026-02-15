"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/use-i18n";
import { translateErrorMessage } from "@/lib/i18n";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { Key, Copy, Check, Plus, Trash2 } from "lucide-react";

type ApiKeyData = {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export function ApiKeysCard() {
  const { t } = useI18n();
  const [apiKeys, setApiKeys] = useState<ApiKeyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // Create dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyExpiry, setNewKeyExpiry] = useState<string>("never");

  // Result dialog (show key once)
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [createdKey, setCreatedKey] = useState("");
  const [copied, setCopied] = useState(false);

  // Revoke dialog
  const [revokeTarget, setRevokeTarget] = useState<ApiKeyData | null>(null);
  const [revoking, setRevoking] = useState(false);

  const loadApiKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/workspaces/api-keys");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load API keys");
      setApiKeys(data.apiKeys || []);
    } catch (error) {
      toast.error(translateErrorMessage(error, t, "Failed to load API keys"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadApiKeys();
  }, [loadApiKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) {
      toast.error(t("Enter a name for the API key"));
      return;
    }

    setCreating(true);
    try {
      const res = await fetch("/api/workspaces/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim(),
          expiresIn: newKeyExpiry,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create API key");

      setCreatedKey(data.key);
      setShowCreateDialog(false);
      setShowResultDialog(true);
      setNewKeyName("");
      setNewKeyExpiry("never");
      await loadApiKeys();
    } catch (error) {
      toast.error(translateErrorMessage(error, t, "Failed to create API key"));
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;

    setRevoking(true);
    try {
      const res = await fetch(
        `/api/workspaces/api-keys/${revokeTarget.id}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to revoke API key");

      toast.success(t("API key revoked"));
      setRevokeTarget(null);
      await loadApiKeys();
    } catch (error) {
      toast.error(translateErrorMessage(error, t, "Failed to revoke API key"));
    } finally {
      setRevoking(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(createdKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("Failed to copy to clipboard"));
    }
  };

  function getKeyStatus(key: ApiKeyData): {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  } {
    if (key.revokedAt) {
      return { label: t("Revoked"), variant: "destructive" };
    }
    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      return { label: t("Expired"), variant: "secondary" };
    }
    return { label: t("Active"), variant: "default" };
  }

  function formatDate(dateStr: string | null): string {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  const activeKeys = apiKeys.filter((k) => !k.revokedAt);
  const revokedKeys = apiKeys.filter((k) => k.revokedAt);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Key className="h-4 w-4" />
                {t("API Keys")}
              </CardTitle>
              <CardDescription>
                {t(
                  "Manage API keys for external integrations (n8n, scripts, etc.)."
                )}
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setShowCreateDialog(true)}
              disabled={loading}
            >
              <Plus className="mr-1 h-3 w-3" />
              {t("Create")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("Loading...")}</p>
          ) : apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("No API keys created yet.")}
            </p>
          ) : (
            <div className="space-y-3">
              {activeKeys.map((key) => {
                const status = getKeyStatus(key);
                return (
                  <div
                    key={key.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{key.name}</span>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span className="font-mono">
                          {key.prefix}{"****"}
                        </span>
                        <span>
                          {t("Created")}: {formatDate(key.createdAt)}
                        </span>
                        {key.expiresAt && (
                          <span>
                            {t("Expires")}: {formatDate(key.expiresAt)}
                          </span>
                        )}
                        {key.lastUsedAt && (
                          <span>
                            {t("Last used")}: {formatDate(key.lastUsedAt)}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setRevokeTarget(key)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}

              {revokedKeys.length > 0 && (
                <div className="pt-2">
                  <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">
                    {t("Revoked Keys")}
                  </p>
                  {revokedKeys.map((key) => {
                    const status = getKeyStatus(key);
                    return (
                      <div
                        key={key.id}
                        className="flex items-center justify-between rounded-md border border-dashed p-3 opacity-60"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {key.name}
                            </span>
                            <Badge variant={status.variant}>
                              {status.label}
                            </Badge>
                          </div>
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            <span className="font-mono">
                              {key.prefix}{"****"}
                            </span>
                            <span>
                              {t("Revoked")}: {formatDate(key.revokedAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create API Key Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Create API Key")}</DialogTitle>
            <DialogDescription>
              {t(
                "Create a new API key for external integrations. The key will only be shown once."
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key-name">{t("Name")}</Label>
              <Input
                id="api-key-name"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder={t("e.g. n8n integration")}
                disabled={creating}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("Expiration")}</Label>
              <Select
                value={newKeyExpiry}
                onValueChange={setNewKeyExpiry}
                disabled={creating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30d">{t("30 days")}</SelectItem>
                  <SelectItem value="90d">{t("90 days")}</SelectItem>
                  <SelectItem value="1y">{t("1 year")}</SelectItem>
                  <SelectItem value="never">{t("Never")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              disabled={creating}
            >
              {t("Cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? t("Creating...") : t("Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show Created Key Dialog */}
      <Dialog
        open={showResultDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowResultDialog(false);
            setCreatedKey("");
            setCopied(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("API Key Created")}</DialogTitle>
            <DialogDescription>
              {t(
                "Copy the key below. It will not be shown again."
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm font-mono break-all">
                {createdKey}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={copyToClipboard}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-destructive font-medium">
              {t("This key will not be shown again. Store it securely.")}
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowResultDialog(false);
                setCreatedKey("");
                setCopied(false);
              }}
            >
              {t("Close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog
        open={!!revokeTarget}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("Revoke API Key")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'Are you sure you want to revoke the API key "{name}"? Any integrations using this key will stop working immediately.',
                { name: revokeTarget?.name ?? "" }
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoking}>
              {t("Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={revoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revoking ? t("Revoking...") : t("Revoke")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
