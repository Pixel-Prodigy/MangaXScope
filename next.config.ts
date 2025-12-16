import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Keep remote patterns for any remaining Next.js Image usage
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ww6.mangakakalot.tv",
      },
      {
        protocol: "https",
        hostname: "uploads.mangadex.org",
      },
      {
        protocol: "https",
        hostname: "api.mangadex.org",
      },
      {
        protocol: "https",
        hostname: "placeholder.pics",
      },
    ],
    // Optimize images for mobile
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // PWA and performance optimizations
  compress: true,
  poweredByHeader: false,
  // Headers for caching and PWA support
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*.{js,css,woff,woff2,ttf,eot}",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*.{png,jpg,jpeg,gif,svg,webp,ico}",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
