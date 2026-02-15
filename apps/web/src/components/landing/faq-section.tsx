"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { FadeInUp } from "@/components/ui/fade-in-up";
import { useI18n } from "@/lib/i18n/use-i18n";

export function FaqSection() {
  const { t } = useI18n();

  const faqs = [
    {
      question: t("What is Robo MultiPost?"),
      answer: t(
        "Robo MultiPost is an AI-powered social media scheduling platform. It lets you schedule posts across 13 platforms, generate content with AI, and automate your workflow via REST API."
      ),
    },
    {
      question: t("How does the AI work?"),
      answer: t(
        "We integrate with the best AI models available. For text: GPT-4o, Claude 3.5, and Gemini. For images: DALL-E 3, Stable Diffusion, and Flux. For videos: Veo 3.1 and Runway. All AI features are built into the compose interface."
      ),
    },
    {
      question: t("What platforms are supported?"),
      answer: t(
        "Instagram, TikTok, YouTube, X (Twitter), LinkedIn, Facebook, Pinterest, Threads, Bluesky, Snapchat, Telegram, Reddit, and Google Business."
      ),
    },
    {
      question: t("Can I integrate with my automation tools?"),
      answer: t(
        "Yes! Robo MultiPost has a full REST API (v1) with interactive Swagger documentation. Create API keys, connect n8n, Make.com, or any tool that supports HTTP requests."
      ),
    },
    {
      question: t("Is my data secure?"),
      answer: t(
        "All credentials are encrypted at rest using AES-256-GCM. Authentication is session-based with secure httpOnly cookies. Workspaces provide data isolation between teams."
      ),
    },
  ];

  return (
    <section className="relative py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <FadeInUp>
          <div className="text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">
              {t("Frequently Asked Questions")}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t("Got questions? We've got answers.")}
            </p>
          </div>
        </FadeInUp>

        <FadeInUp delay={0.2}>
          <Accordion type="single" collapsible className="mt-12">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`faq-${index}`}>
                <AccordionTrigger className="text-left text-base">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </FadeInUp>
      </div>
    </section>
  );
}
