"use client";

import { Link2, PenTool, Rocket } from "lucide-react";
import { FadeInUp } from "@/components/ui/fade-in-up";
import { useI18n } from "@/lib/i18n/use-i18n";

export function HowItWorks() {
  const { t } = useI18n();

  const steps = [
    {
      icon: Link2,
      number: "01",
      title: t("Connect your accounts"),
      description: t(
        "Link your social media profiles securely with encrypted credentials."
      ),
    },
    {
      icon: PenTool,
      number: "02",
      title: t("Create & schedule"),
      description: t(
        "Compose posts with AI assistance, generate images, and pick the perfect time to publish."
      ),
    },
    {
      icon: Rocket,
      number: "03",
      title: t("Publish automatically"),
      description: t(
        "Sit back while your content goes live across all platforms on schedule."
      ),
    },
  ];

  return (
    <section className="relative py-20 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInUp>
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              {t("How it works")}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t("Get started in 3 simple steps")}
            </p>
          </div>
        </FadeInUp>

        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          {steps.map((step, index) => (
            <FadeInUp key={step.number} delay={index * 0.2}>
              <div className="relative text-center">
                {/* Connector line (hidden on mobile, between cards on desktop) */}
                {index < steps.length - 1 && (
                  <div className="hidden sm:block absolute top-10 left-[calc(50%+40px)] w-[calc(100%-80px)] h-px bg-gradient-to-r from-primary/40 to-primary/10" />
                )}

                {/* Step number badge */}
                <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20">
                  <step.icon className="h-8 w-8 text-primary" />
                  <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    {step.number}
                  </span>
                </div>

                <h3 className="mt-6 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
                  {step.description}
                </p>
              </div>
            </FadeInUp>
          ))}
        </div>
      </div>
    </section>
  );
}
