import type { NextConfig } from "next";

const IS_DEV = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  turbopack: {
    root: __dirname, // ensure Turbopack uses this app as root
  },
  images: {
    // Next.js 16.1.x image optimization has been observed to hang in this workspace
    // (requests to `/_next/image` never return), which makes the app appear to
    // "load forever" in dev. Disable optimization only in development.
    unoptimized: IS_DEV,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "image.tmdb.org",
      },
      {
        protocol: "https",
        hostname: "d1fmdyqfafwim3.cloudfront.net",
      },
    ],
  },
  async rewrites() {
    return {
      beforeFiles: [
        // Show tabs (path-based UI state -> canonical page renderer)
        { source: "/admin/trr-shows/:showId/overview", destination: "/admin/trr-shows/:showId?tab=details" },
        { source: "/admin/trr-shows/:showId/details", destination: "/admin/trr-shows/:showId?tab=details" },
        { source: "/admin/trr-shows/:showId/settings", destination: "/admin/trr-shows/:showId?tab=settings" },
        { source: "/admin/trr-shows/:showId/seasons", destination: "/admin/trr-shows/:showId?tab=seasons" },
        { source: "/admin/trr-shows/:showId/news", destination: "/admin/trr-shows/:showId?tab=news" },
        { source: "/admin/trr-shows/:showId/cast", destination: "/admin/trr-shows/:showId?tab=cast" },
        { source: "/admin/trr-shows/:showId/surveys", destination: "/admin/trr-shows/:showId?tab=surveys" },
        { source: "/admin/trr-shows/:showId/social", destination: "/admin/trr-shows/:showId?tab=social" },
        { source: "/admin/trr-shows/:showId/assets", destination: "/admin/trr-shows/:showId?tab=assets&assets=images" },
        { source: "/admin/trr-shows/:showId/assets/images", destination: "/admin/trr-shows/:showId?tab=assets&assets=images" },
        { source: "/admin/trr-shows/:showId/assets/videos", destination: "/admin/trr-shows/:showId?tab=assets&assets=videos" },
        { source: "/admin/trr-shows/:showId/assets/brand", destination: "/admin/trr-shows/:showId?tab=assets&assets=brand" },

        // Season tabs
        {
          source: "/admin/trr-shows/:showId/seasons/:seasonNumber/episodes",
          destination: "/admin/trr-shows/:showId/seasons/:seasonNumber?tab=episodes",
        },
        {
          source: "/admin/trr-shows/:showId/seasons/:seasonNumber/assets",
          destination: "/admin/trr-shows/:showId/seasons/:seasonNumber?tab=assets&assets=media",
        },
        {
          source: "/admin/trr-shows/:showId/seasons/:seasonNumber/assets/media",
          destination: "/admin/trr-shows/:showId/seasons/:seasonNumber?tab=assets&assets=media",
        },
        {
          source: "/admin/trr-shows/:showId/seasons/:seasonNumber/assets/brand",
          destination: "/admin/trr-shows/:showId/seasons/:seasonNumber?tab=assets&assets=brand",
        },
        {
          source: "/admin/trr-shows/:showId/seasons/:seasonNumber/videos",
          destination: "/admin/trr-shows/:showId/seasons/:seasonNumber?tab=videos",
        },
        {
          source: "/admin/trr-shows/:showId/seasons/:seasonNumber/cast",
          destination: "/admin/trr-shows/:showId/seasons/:seasonNumber?tab=cast",
        },
        {
          source: "/admin/trr-shows/:showId/seasons/:seasonNumber/surveys",
          destination: "/admin/trr-shows/:showId/seasons/:seasonNumber?tab=surveys",
        },
        {
          source: "/admin/trr-shows/:showId/seasons/:seasonNumber/social",
          destination: "/admin/trr-shows/:showId/seasons/:seasonNumber?tab=social",
        },
        {
          source: "/admin/trr-shows/:showId/seasons/:seasonNumber/details",
          destination: "/admin/trr-shows/:showId/seasons/:seasonNumber?tab=details",
        },
      ],
    };
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'unsafe-none',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
