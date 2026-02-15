"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { FadeInUp } from "@/components/ui/fade-in-up";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import { useI18n } from "@/lib/i18n/use-i18n";

export function AiAutomationCta() {
  const { t } = useI18n();

  return (
    <section className="relative py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInUp>
          <SpotlightCard className="p-8 text-center sm:p-16">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <h2 className="mt-6 text-3xl font-bold sm:text-4xl">
              {t("AI-powered social media management")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
              {t(
                "Let AI write your captions, generate images and videos, and automate your workflow. Connect with n8n, Make.com, and any tool via our REST API."
              )}
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="text-base px-8" asChild>
                <Link href="/signup">
                  {t("Get Started")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-base px-8"
                asChild
              >
                <a href="#features">
                  <Zap className="mr-2 h-5 w-5" />
                  {t("Explore the API")}
                </a>
              </Button>
            </div>
          </SpotlightCard>
        </FadeInUp>
      </div>
    </section>
  );
}
