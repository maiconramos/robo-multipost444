"use client";

import { PlatformIcon } from "@/components/shared/platform-icon";
import { InfiniteMarquee } from "@/components/ui/infinite-marquee";
import { FadeInUp } from "@/components/ui/fade-in-up";
import { PLATFORMS, PLATFORM_NAMES } from "@/lib/platforms/types";
import { useI18n } from "@/lib/i18n/use-i18n";

export function PlatformMarquee() {
  const { t } = useI18n();

  const firstHalf = PLATFORMS.slice(0, Math.ceil(PLATFORMS.length / 2));
  const secondHalf = PLATFORMS.slice(Math.ceil(PLATFORMS.length / 2));

  return (
    <section className="relative py-16 overflow-hidden">
      <FadeInUp>
        <p className="text-center text-sm font-medium text-muted-foreground mb-8">
          {t("Supports 13 platforms")}
        </p>
      </FadeInUp>

      <div className="space-y-4">
        <InfiniteMarquee speed={35} direction="left">
          {firstHalf.map((platform) => (
            <div
              key={platform}
              className="flex items-center gap-3 rounded-full border border-border bg-card/80 backdrop-blur-sm px-5 py-2.5 shrink-0"
            >
              <PlatformIcon platform={platform} size="md" showColor />
              <span className="text-sm font-medium whitespace-nowrap">
                {PLATFORM_NAMES[platform]}
              </span>
            </div>
          ))}
        </InfiniteMarquee>

        <InfiniteMarquee speed={35} direction="right">
          {secondHalf.map((platform) => (
            <div
              key={platform}
              className="flex items-center gap-3 rounded-full border border-border bg-card/80 backdrop-blur-sm px-5 py-2.5 shrink-0"
            >
              <PlatformIcon platform={platform} size="md" showColor />
              <span className="text-sm font-medium whitespace-nowrap">
                {PLATFORM_NAMES[platform]}
              </span>
            </div>
          ))}
        </InfiniteMarquee>
      </div>
    </section>
  );
}
