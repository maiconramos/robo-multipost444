"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useSession } from "@/lib/auth/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n/use-i18n";
import { EntitySelector } from "./entity-selector";

type CallbackStep = "processing" | "selecting" | "success" | "error";

interface PendingCandidate {
  id: string;
  name: string;
  username?: string;
  profilePicture?: string;
  description?: string;
}

interface PendingFlowState {
  flowId: string;
  platform: string;
  candidates: PendingCandidate[];
}

type CallbackResponse =
  | {
    type: "complete";
    profileId: string;
    providerType: "late" | "byo";
  }
  | {
    type: "pending";
    flowId: string;
    platform: string;
    profileId: string;
    providerType: "byo";
    candidates: PendingCandidate[];
  };

export function CallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  const { t } = useI18n();

  const [step, setStep] = useState<CallbackStep>("processing");
  const [error, setError] = useState<string | null>(null);
  const [pendingFlow, setPendingFlow] = useState<PendingFlowState | null>(null);
  const [isFinalizingSelection, setIsFinalizingSelection] = useState(false);

  const callbackPayload = useMemo(
    () => ({
      code: searchParams.get("code"),
      state: searchParams.get("state"),
      platform: searchParams.get("platform"),
      errorParam: searchParams.get("error") || searchParams.get("error_description"),
    }),
    [searchParams],
  );

  const finalizeSelection = useCallback(
    async (candidateId: string) => {
      if (!pendingFlow) {
        return;
      }

      setIsFinalizingSelection(true);
      try {
        const response = await fetch("/api/accounts/callback/finalize", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            flowId: pendingFlow.flowId,
            candidateId,
          }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(t(data.error || "Failed to finalize account connection"));
        }

        setStep("success");
        setPendingFlow(null);
        toast.success(t("Account connected successfully"));
        setTimeout(() => {
          router.push("/dashboard/accounts");
        }, 1200);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("Failed to process callback"));
        setStep("error");
      } finally {
        setIsFinalizingSelection(false);
      }
    },
    [pendingFlow, router, t],
  );

  const handleCallback = useCallback(async () => {
    if (callbackPayload.errorParam) {
      setError(callbackPayload.errorParam);
      setStep("error");
      return;
    }

    if (!callbackPayload.code || !callbackPayload.state) {
      setError(t("Missing callback parameters (code/state)"));
      setStep("error");
      return;
    }

    try {
      const response = await fetch("/api/accounts/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platform: callbackPayload.platform,
          code: callbackPayload.code,
          state: callbackPayload.state,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as CallbackResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(t(data.error || "Failed to finish account connection"));
      }

      if (data.type === "pending") {
        setPendingFlow({
          flowId: data.flowId,
          platform: data.platform,
          candidates: data.candidates,
        });
        setStep("selecting");
        return;
      }

      setStep("success");
      toast.success(t("Account connected successfully"));
      setTimeout(() => {
        router.push("/dashboard/accounts");
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Failed to process callback"));
      setStep("error");
    }
  }, [callbackPayload, router, t]);

  useEffect(() => {
    if (isPending) {
      return;
    }

    if (!session) {
      router.push("/login");
      return;
    }

    if (step === "processing") {
      void handleCallback();
    }
  }, [session, isPending, router, handleCallback, step]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>
            {step === "processing" && t("Connecting Account...")}
            {step === "selecting" && t("Select Account")}
            {step === "success" && t("Connected")}
            {step === "error" && t("Connection Failed")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {step === "processing" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">{t("Finishing OAuth callback...")}</p>
            </div>
          )}

          {step === "selecting" && pendingFlow && (
            <div className="space-y-4 py-2">
              <p className="text-center text-sm text-muted-foreground">
                {t("Choose which account you want to connect")}
              </p>
              <EntitySelector
                platform={pendingFlow.platform}
                entities={pendingFlow.candidates.map((candidate) => ({
                  id: candidate.id,
                  name: candidate.name,
                  picture: candidate.profilePicture,
                  address: candidate.description,
                }))}
                onSelect={(entityId) => {
                  if (!isFinalizingSelection) {
                    void finalizeSelection(entityId);
                  }
                }}
              />
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="h-12 w-12 text-success" />
              <p className="text-muted-foreground">{t("Redirecting to accounts...")}</p>
            </div>
          )}

          {step === "error" && (
            <div className="flex flex-col items-center gap-4 py-8">
              <AlertCircle className="h-12 w-12 text-destructive" />
              <p className="text-center text-muted-foreground">{error}</p>
              <Button onClick={() => router.push("/dashboard/accounts")}>{t("Back to Accounts")}</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
