"use client";

import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import { useRef, useState } from "react";

interface InfiniteMarqueeProps {
  children: React.ReactNode;
  direction?: "left" | "right";
  speed?: number;
  pauseOnHover?: boolean;
  className?: string;
}

export function InfiniteMarquee({
  children,
  direction = "left",
  speed = 30,
  pauseOnHover = true,
  className,
}: InfiniteMarqueeProps) {
  const reduced = useReducedMotion();
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  if (reduced) {
    return (
      <div className={cn("flex flex-wrap items-center justify-center gap-4", className)}>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("group relative flex overflow-hidden", className)}
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 15%, black 85%, transparent)",
      }}
      onMouseEnter={() => pauseOnHover && setIsPaused(true)}
      onMouseLeave={() => pauseOnHover && setIsPaused(false)}
    >
      <div
        className="marquee-track flex shrink-0 items-center gap-6"
        style={{
          animationName: "marquee-scroll",
          animationDuration: `${speed}s`,
          animationTimingFunction: "linear",
          animationIterationCount: "infinite",
          animationDirection: direction === "right" ? "reverse" : "normal",
          animationPlayState: isPaused ? "paused" : "running",
        }}
      >
        {children}
        {/* Duplicate for seamless loop */}
        {children}
      </div>
    </div>
  );
}
