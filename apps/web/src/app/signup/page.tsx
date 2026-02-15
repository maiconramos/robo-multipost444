"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp, useSession } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageSwitcher, Logo } from "@/components/shared";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n/use-i18n";

export default function SignupPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();
  const { t } = useI18n();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (session && !sessionLoading) {
      router.push("/dashboard");
    }
  }, [session, sessionLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !password.trim()) {
      toast.error(t("Please fill in all fields"));
      return;
    }

    if (password.length < 8) {
      toast.error(t("Password must be at least 8 characters"));
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUp.email({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      if (result.error) {
        toast.error(t(result.error.message || "Failed to create account"));
        return;
      }

      toast.success(t("Account created successfully!"));
      router.push("/dashboard");
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
          <CardTitle className="text-2xl">{t("Create an account")}</CardTitle>
          <CardDescription>
            {t("Get started with Robo MultiPost.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t("Name")}</Label>
              <Input
                id="name"
                type="text"
                placeholder={t("Your name")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                autoComplete="name"
                autoFocus
              />
            </div>

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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("Password")}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t("Minimum 8 characters")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("Creating account...")}
                </>
              ) : (
                t("Create Account")
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {t("Already have an account?")}{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              {t("Sign in")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
