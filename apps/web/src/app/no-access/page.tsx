"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageSwitcher, Logo } from "@/components/shared";
import { ShieldX } from "lucide-react";
import { useI18n } from "@/lib/i18n/use-i18n";

export default function NoAccessPage() {
  const router = useRouter();
  const { t } = useI18n();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

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
          <div className="flex justify-center mb-2">
            <ShieldX className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle>{t("No Workspace Access")}</CardTitle>
          <CardDescription>
            {t("You are not a member of any workspace. Ask your administrator for an invitation to get started.")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleSignOut}>
            {t("Sign Out")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
