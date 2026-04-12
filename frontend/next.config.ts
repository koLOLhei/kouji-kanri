import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize for production performance
  reactStrictMode: true,
  poweredByHeader: false,

  // Compress responses
  compress: true,

  // Optimize images
  images: {
    formats: ["image/avif", "image/webp"],
  },

  // Reduce JS bundle size
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@tanstack/react-query",
    ],
  },
};

export default nextConfig;
