"use client";

import Link from "next/link";
import { Logo } from "@/components/shared";
import { PlatformIcon } from "@/components/shared/platform-icon";
import { PLATFORMS } from "@/lib/platforms/types";
import { useI18n } from "@/lib/i18n/use-i18n";

export function LandingFooter() {
  const { t } = useI18n();

  return (
    <footer className="relative border-t border-border bg-muted/30 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Brand */}
          <div>
            <Logo size="md" />
            <p className="mt-3 text-sm text-muted-foreground max-w-xs">
              {t("Robo MultiPost - AI-powered social media scheduling")}
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold">{t("Product")}</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href="/signup"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("Get Started")}
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("Sign In")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="text-sm font-semibold">{t("Resources")}</h3>
            <ul className="mt-3 space-y-2">
              <li>
                <Link
                  href="/dashboard/api-docs"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t("API Docs")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Platform icons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 border-t border-border pt-8">
          {PLATFORMS.map((platform) => (
            <div
              key={platform}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50"
            >
              <PlatformIcon platform={platform} size="sm" showColor />
            </div>
          ))}
        </div>

        {/* Copyright */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Robo MultiPost.
          </p>
        </div>
      </div>
    </footer>
  );
}
