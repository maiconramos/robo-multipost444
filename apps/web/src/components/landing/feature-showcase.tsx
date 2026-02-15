"use client";

import { type ComponentType } from "react";
import Image from "next/image";
import {
  Sparkles,
  Video,
  Calendar,
  Share2,
  Code2,
  Layers,
} from "lucide-react";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { FadeInUp } from "@/components/ui/fade-in-up";
import { useI18n } from "@/lib/i18n/use-i18n";

interface FeatureItem {
  icon: ComponentType<{ className?: string }>;
  titleKey: string;
  descriptionKey: string;
  bulletKeys: string[];
  image: string;
}

const FEATURES: FeatureItem[] = [
  {
    icon: Sparkles,
    titleKey: "AI Content Creation",
    descriptionKey:
      "Generate captions, improve text, translate, and create hashtags with AI models like GPT-4o, Claude, and Gemini.",
    bulletKeys: [
      "5 built-in AI presets: caption, improve, shorten, hashtags, translate",
      "Custom prompts for unlimited flexibility",
      "GPT-4o, Claude 3.5 Sonnet, and Gemini models",
    ],
    image: "/images/conteudo-ia.avif",
  },
  {
    icon: Video,
    titleKey: "AI Image & Video Generation",
    descriptionKey:
      "Create stunning visuals with Veo 3, DALL-E 3, Flux, and Stable Diffusion. Generate videos with Runway and Veo.",
    bulletKeys: [
      "Video generation with Veo 3.1 and Runway Aleph",
      "Image generation with DALL-E 3, Flux, and Stable Diffusion",
      "5 styles: realistic, cartoon, minimalist, artistic, photographic",
      "Multiple aspect ratios: 1:1, 4:5, 16:9, 9:16",
    ],
    image: "/images/geracao-ia-image-video.avif",
  },
  {
    icon: Calendar,
    titleKey: "Smart Scheduling",
    descriptionKey:
      "Visual calendar and smart queue system to publish your content at the perfect time, every time.",
    bulletKeys: [
      "Drag-and-drop visual calendar",
      "Smart queue with custom time slots per day",
      "Timezone-aware scheduling",
    ],
    image: "/images/agenda.avif",
  },
  {
    icon: Share2,
    titleKey: "Multi-Platform Publishing",
    descriptionKey:
      "Publish to 13 social networks from a single compose interface with per-platform settings.",
    bulletKeys: [
      "Instagram, TikTok, YouTube, X, LinkedIn, and 8 more",
      "Per-platform settings: post type, visibility, tags",
      "Publish now, schedule, or add to queue",
    ],
    image: "/images/multi-social.avif",
  },
  {
    icon: Code2,
    titleKey: "API & Automation",
    descriptionKey:
      "Full REST API with Swagger docs. Connect n8n, Make.com, or any automation tool to manage your posts programmatically.",
    bulletKeys: [
      "REST API v1 with full CRUD for posts, accounts, and media",
      "Ready for n8n, Make.com, and custom integrations",
      "API key management with expiration and usage tracking",
      "Interactive Swagger documentation",
    ],
    image: "/images/api-rest.avif",
  },
  {
    icon: Layers,
    titleKey: "Unlimited Workspaces",
    descriptionKey:
      "Create as many workspaces as you need, each with unlimited social media accounts. Manage multiple brands, clients, or projects — all from one place.",
    bulletKeys: [
      "Unlimited workspaces for brands, clients, or projects",
      "Unlimited social media accounts per workspace",
      "Complete isolation between workspaces for security and organization",
      "Switch between workspaces instantly with one click",
    ],
    image: "/images/workspaces-ilimitados.png",
  },
];

function FeatureRow({
  feature,
  index,
}: {
  feature: FeatureItem;
  index: number;
}) {
  const { t } = useI18n();
  const isEven = index % 2 === 0;

  return (
    <FadeInUp delay={0.1}>
      <div
        className={`flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-16 ${!isEven ? "lg:flex-row-reverse" : ""
          }`}
      >
        {/* Feature image */}
        <div className="flex-1 min-w-0">
          <SpotlightCard className="p-2">
            <div className="relative aspect-[16/10] rounded-lg overflow-hidden">
              <Image
                src={feature.image}
                alt={t(feature.titleKey)}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </SpotlightCard>
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0 space-y-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
            <feature.icon className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-2xl font-bold sm:text-3xl">
            {t(feature.titleKey)}
          </h3>
          <p className="text-base text-muted-foreground leading-relaxed sm:text-lg">
            {t(feature.descriptionKey)}
          </p>
          <ul className="space-y-3 pt-1">
            {feature.bulletKeys.map((key) => (
              <li
                key={key}
                className="flex items-start gap-3 text-sm text-muted-foreground"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </FadeInUp>
  );
}

export function FeatureShowcase() {
  const { t } = useI18n();

  return (
    <section id="features" className="relative py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInUp>
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl lg:text-5xl">
              {t("Everything you need")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              {t(
                "A complete AI-powered solution for social media managers and marketers."
              )}
            </p>
          </div>
        </FadeInUp>

        <div className="mt-24 space-y-28">
          {FEATURES.map((feature, index) => (
            <FeatureRow
              key={feature.titleKey}
              feature={feature}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
