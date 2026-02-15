"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/client";
import { LandingHeader } from "@/components/landing/landing-header";
import { HeroSection } from "@/components/landing/hero-section";
import { FeatureShowcase } from "@/components/landing/feature-showcase";
import { HowItWorks } from "@/components/landing/how-it-works";
import { StatsBar } from "@/components/landing/stats-bar";
import { FaqSection } from "@/components/landing/faq-section";
import { AiAutomationCta } from "@/components/landing/ai-automation-cta";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function LandingPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = useSession();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!sessionLoading && session) {
      router.push("/dashboard");
    }
  }, [session, sessionLoading, router]);

  // Don't render until session state resolved
  if (sessionLoading) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <LandingHeader />
      <HeroSection />
      <FeatureShowcase />
      <HowItWorks />
      <StatsBar />
      <FaqSection />
      <AiAutomationCta />
      <LandingFooter />
    </div>
  );
}
