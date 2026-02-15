"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AuroraBackground } from "@/components/ui/aurora-background";
import { TextGenerateEffect } from "@/components/ui/text-generate-effect";
import { FadeInUp } from "@/components/ui/fade-in-up";
import { InfiniteMarquee } from "@/components/ui/infinite-marquee";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { PLATFORMS, PLATFORM_NAMES } from "@/lib/platforms/types";
import { ArrowRight, Sparkles } from "lucide-react";
import { useI18n } from "@/lib/i18n/use-i18n";

export function HeroSection() {
  const { t } = useI18n();

  const firstHalf = PLATFORMS.slice(0, Math.ceil(PLATFORMS.length / 2));
  const secondHalf = PLATFORMS.slice(Math.ceil(PLATFORMS.length / 2));

  return (
    <AuroraBackground className="min-h-[calc(100vh-4rem)]">
      <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-7xl">
              <TextGenerateEffect words={t("Your social media")} />
              <br />
              <span className="text-primary">
                <TextGenerateEffect
                  words={t("scheduling wizard")}
                  speed={0.08}
                />
              </span>
            </h1>

            <FadeInUp delay={0.6} className="mx-auto mt-6 max-w-2xl">
              <p className="text-lg text-muted-foreground sm:text-xl">
                {t(
                  "Schedule posts across 13 platforms with AI-powered content creation, image generation, and automation via REST API."
                )}
              </p>
            </FadeInUp>

            <FadeInUp delay={0.9}>
              <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Button size="lg" className="text-base px-8 py-6" asChild>
                  <Link href="/signup">
                    {t("Get Started")}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base px-8 py-6"
                  asChild
                >
                  <a href="#features">
                    <Sparkles className="mr-2 h-5 w-5" />
                    {t("See AI in Action")}
                  </a>
                </Button>
              </div>
            </FadeInUp>

            {/* Platform marquee */}
            <FadeInUp delay={1.1} className="mx-auto mt-12 max-w-4xl">
              <p className="text-center text-sm font-medium text-muted-foreground mb-6">
                {t("Supports 13 platforms")}
              </p>
              <div className="space-y-3">
                <InfiniteMarquee speed={35} direction="left">
                  {firstHalf.map((platform) => (
                    <div
                      key={platform}
                      className="flex items-center gap-2 rounded-full border border-border bg-card/60 backdrop-blur-sm px-4 py-2 shrink-0"
                    >
                      <PlatformIcon platform={platform} size="sm" showColor />
                      <span className="text-xs font-medium whitespace-nowrap">
                        {PLATFORM_NAMES[platform]}
                      </span>
                    </div>
                  ))}
                </InfiniteMarquee>

                <InfiniteMarquee speed={35} direction="right">
                  {secondHalf.map((platform) => (
                    <div
                      key={platform}
                      className="flex items-center gap-2 rounded-full border border-border bg-card/60 backdrop-blur-sm px-4 py-2 shrink-0"
                    >
                      <PlatformIcon platform={platform} size="sm" showColor />
                      <span className="text-xs font-medium whitespace-nowrap">
                        {PLATFORM_NAMES[platform]}
                      </span>
                    </div>
                  ))}
                </InfiniteMarquee>
              </div>
            </FadeInUp>
          </div>
        </div>
      </section>
    </AuroraBackground>
  );
}
