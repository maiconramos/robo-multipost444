"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/use-i18n";
import { ComposeForm } from "@/components/compose/compose-form";

export default function ComposePage() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">{t("Create Post")}</h1>
        <p className="text-muted-foreground">
          {t("Compose and schedule your content.")}
        </p>
      </div>

      <ComposeForm onSuccess={() => router.push("/dashboard/calendar")} />
    </div>
  );
}
