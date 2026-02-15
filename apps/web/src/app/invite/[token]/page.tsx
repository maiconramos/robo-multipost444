"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageSwitcher, Logo } from "@/components/shared";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/use-i18n";

export default function InviteAcceptPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  const { data: session, isPending: sessionLoading } = useSession();
  const { t } = useI18n();

  const [status, setStatus] = useState<"loading" | "accepting" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const acceptInvite = useCallback(async () => {
    setStatus("accepting");

    try {
      const response = await fetch("/api/workspaces/invite", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStatus("error");
        setErrorMessage(t(data.error || "Failed to accept invitation"));
        return;
      }

      setStatus("success");
      toast.success(t("Invitation accepted!"));

      // Redirect to dashboard after a brief moment
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch {
      setStatus("error");
      setErrorMessage(t("Something went wrong. Please try again."));
    }
  }, [token, router, t]);

  useEffect(() => {
    // Wait for session to load
    if (sessionLoading) return;

    // Not logged in - redirect to login with return URL
    if (!session) {
      router.push(`/login?returnUrl=/invite/${token}`);
      return;
    }

    // Already logged in - auto-accept the invite
    acceptInvite();
  }, [session, sessionLoading, token, router, acceptInvite]);

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <Logo size="lg" showText={false} />
          </div>

          {(status === "loading" || status === "accepting") && (
            <>
              <div className="flex justify-center mb-2">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <CardTitle>{t("Accepting invitation...")}</CardTitle>
              <CardDescription>
                {t("Please wait while we process your invitation.")}
              </CardDescription>
            </>
          )}

          {status === "success" && (
            <>
              <div className="flex justify-center mb-2">
                <CheckCircle2 className="h-12 w-12 text-success" />
              </div>
              <CardTitle>{t("Welcome!")}</CardTitle>
              <CardDescription>
                {t("You have been added to the workspace. Redirecting to dashboard...")}
              </CardDescription>
            </>
          )}

          {status === "error" && (
            <>
              <div className="flex justify-center mb-2">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle>{t("Invitation Error")}</CardTitle>
              <CardDescription>{errorMessage}</CardDescription>
            </>
          )}
        </CardHeader>

        {status === "error" && (
          <CardContent className="space-y-2">
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              {t("Go to Dashboard")}
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
