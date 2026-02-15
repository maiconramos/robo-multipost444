"use client";

import {
  Calendar,
  Clock,
  Image as ImageIcon,
  Share2,
  Server,
  Scale,
} from "lucide-react";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { FadeInUp } from "@/components/ui/fade-in-up";
import { useI18n } from "@/lib/i18n/use-i18n";

export function FeaturesBento() {
  const { t } = useI18n();

  const features = [
    {
      icon: Calendar,
      title: t("Visual Calendar"),
      description: t("See all your scheduled content at a glance"),
      large: true,
    },
    {
      icon: Clock,
      title: t("Smart Queue"),
      description: t("Set posting times once, auto-schedule the rest"),
      large: true,
    },
    {
      icon: ImageIcon,
      title: t("Media Support"),
      description: t("Upload images and videos up to 5GB"),
      large: false,
    },
    {
      icon: Share2,
      title: t("13 Platforms"),
      description: t("Instagram, TikTok, YouTube, X, LinkedIn & more"),
      large: false,
    },
    {
      icon: Server,
      title: t("Self-Hostable"),
      description: t("Deploy on your own infrastructure"),
      large: false,
    },
    {
      icon: Scale,
      title: t("MIT Licensed"),
      description: t("Free forever, no vendor lock-in"),
      large: false,
    },
  ];

  return (
    <section className="relative py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInUp>
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              {t("Everything you need")}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t(
                "A complete scheduling solution for social media managers and marketers."
              )}
            </p>
          </div>
        </FadeInUp>

        <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, index) => (
            <FadeInUp
              key={feature.title}
              delay={index * 0.1}
              className={feature.large ? "sm:col-span-2" : ""}
            >
              <SpotlightCard className="h-full p-6 hover:border-primary/30 transition-colors duration-300">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </SpotlightCard>
            </FadeInUp>
          ))}
        </div>
      </div>
    </section>
  );
}
