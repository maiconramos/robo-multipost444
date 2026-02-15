import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Heavy packages that should not be bundled into the Worker
  serverExternalPackages: [
    "@prisma/client",
  ],

  // Tree-shake barrel-file packages for smaller bundles
  experimental: {
    optimizePackageImports: [
      "motion",
      "radix-ui",
      "@radix-ui/react-accordion",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-avatar",
      "@radix-ui/react-checkbox",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-label",
      "@radix-ui/react-popover",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-separator",
      "@radix-ui/react-slot",
      "@radix-ui/react-switch",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
      "react-hook-form",
      "@hookform/resolvers",
      "date-fns",
      "date-fns-tz",
      "lucide-react",

    ],
  },



  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@vercel/og": false,
    };
    return config;
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.getlate.dev",
      },
      {
        protocol: "https",
        hostname: "**.cdninstagram.com",
      },
      {
        protocol: "https",
        hostname: "**.fbcdn.net",
      },
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
      },
    ],
  },
};

export default nextConfig;
