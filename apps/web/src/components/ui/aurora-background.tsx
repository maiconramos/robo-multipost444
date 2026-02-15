"use client";

import { cn } from "@/lib/utils";

interface AuroraBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export function AuroraBackground({ children, className }: AuroraBackgroundProps) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Aurora blobs */}
      <div
        className="aurora-blob absolute -top-40 -right-32 w-[400px] h-[400px] md:w-[600px] md:h-[600px] bg-primary/20 dark:bg-primary/15"
        style={{ animation: "aurora-1 8s ease-in-out infinite", willChange: "transform" }}
      />
      <div
        className="aurora-blob absolute -bottom-40 -left-32 w-[350px] h-[350px] md:w-[550px] md:h-[550px] bg-primary/15 dark:bg-primary/10"
        style={{ animation: "aurora-2 12s ease-in-out infinite", willChange: "transform" }}
      />
      <div
        className="aurora-blob absolute top-1/4 left-1/3 w-[300px] h-[300px] md:w-[450px] md:h-[450px] bg-primary/10 dark:bg-primary/8"
        style={{ animation: "aurora-3 15s ease-in-out infinite", willChange: "transform" }}
      />
      <div
        className="aurora-blob hidden md:block absolute top-1/2 right-1/4 w-[350px] h-[350px] bg-primary/12 dark:bg-primary/8"
        style={{ animation: "aurora-4 18s ease-in-out infinite", willChange: "transform" }}
      />

      {/* Noise overlay for texture */}
      <div className="absolute inset-0 bg-background/60 dark:bg-background/70 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
