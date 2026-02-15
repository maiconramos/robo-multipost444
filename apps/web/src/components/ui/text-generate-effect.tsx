"use client";

import { useEffect } from "react";
import { motion, stagger, useAnimate, useInView } from "motion/react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

interface TextGenerateEffectProps {
  words: string;
  className?: string;
  speed?: number;
}

export function TextGenerateEffect({
  words,
  className,
  speed = 0.05,
}: TextGenerateEffectProps) {
  const [scope, animate] = useAnimate();
  const isInView = useInView(scope, { once: true });
  const reduced = useReducedMotion();
  const wordsArray = words.split(" ");

  useEffect(() => {
    if (isInView && !reduced) {
      animate(
        "span",
        { opacity: 1, filter: "blur(0px)" },
        { duration: 0.4, delay: stagger(speed) }
      );
    }
  }, [isInView, reduced, animate, speed]);

  if (reduced) {
    return <span className={className}>{words}</span>;
  }

  return (
    <motion.span ref={scope} className={cn("inline", className)}>
      {wordsArray.map((word, idx) => (
        <motion.span
          key={`${word}-${idx}`}
          className="inline-block opacity-0"
          style={{ filter: "blur(8px)" }}
        >
          {word}{idx < wordsArray.length - 1 ? "\u00A0" : ""}
        </motion.span>
      ))}
    </motion.span>
  );
}
