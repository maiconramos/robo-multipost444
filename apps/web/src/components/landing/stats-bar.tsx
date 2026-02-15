"use client";

import { useRef, useEffect, useState } from "react";
import { useInView } from "motion/react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { FadeInUp } from "@/components/ui/fade-in-up";
import { useI18n } from "@/lib/i18n/use-i18n";
import { Monitor, Sparkles, ShieldCheck, Code2 } from "lucide-react";

function CountUp({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref as React.RefObject<Element>, { once: true });
  const reduced = useReducedMotion();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    if (reduced) {
      setCount(target);
      return;
    }

    const duration = 1500;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }
    requestAnimationFrame(tick);
  }, [isInView, target, reduced]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

export function StatsBar() {
  const { t } = useI18n();

  const stats = [
    {
      icon: Monitor,
      value: 13,
      suffix: "+",
      label: t("Supported Platforms"),
      isText: false,
    },
    {
      icon: Sparkles,
      value: 5,
      suffix: "+",
      label: t("AI Models"),
      isText: false,
    },
    {
      icon: ShieldCheck,
      value: 256,
      suffix: "-bit",
      label: t("Encrypted"),
      isText: false,
    },
    {
      icon: Code2,
      value: 0,
      suffix: "REST API",
      label: t("Automation Ready"),
      isText: true,
    },
  ];

  return (
    <section className="relative py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeInUp>
          <div className="rounded-2xl border border-border bg-gradient-to-br from-card to-muted/30 p-8 sm:p-12">
            <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <stat.icon className="mx-auto h-6 w-6 text-primary mb-3" />
                  <div className="text-3xl font-bold sm:text-4xl">
                    {stat.isText ? (
                      <span>{stat.suffix}</span>
                    ) : (
                      <CountUp target={stat.value} suffix={stat.suffix} />
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </FadeInUp>
      </div>
    </section>
  );
}
