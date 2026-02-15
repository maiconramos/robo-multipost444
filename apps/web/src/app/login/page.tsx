"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn, useSession } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageSwitcher, Logo } from "@/components/shared";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";
import { useI18n } from "@/lib/i18n/use-i18n";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/dashboard";
  const { data: session, isPending: sessionLoading } = useSession();
  const { t } = useI18n();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (session && !sessionLoading) {
      router.push(returnUrl);
    }
  }, [session, sessionLoading, router, returnUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error(t("Please fill in all fields"));
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn.email({
        email: email.trim(),
        password,
      });

      if (result.error) {
        toast.error(t(result.error.message || "Invalid email or password"));
        return;
      }

      router.push(returnUrl);
    } catch {
      toast.error(t("Something went wrong. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  if (sessionLoading) {
    return null;
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Logo size="lg" showText={false} />
          </div>
          <CardTitle className="text-2xl">{t("Sign in")}</CardTitle>
          <CardDescription>
            {t("Enter your email and password to access your account.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("Email")}</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("Password")}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t("Your password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("Signing in...")}
                </>
              ) : (
                t("Sign In")
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {t("Don't have an account?")}{" "}
            <Link
              href="/signup"
              className="font-medium text-primary hover:underline"
            >
              {t("Sign up")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
