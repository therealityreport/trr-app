import type { NextConfig } from "next";

const IS_DEV = process.env.NODE_ENV === "development";
const DIST_DIR = process.env.NEXT_DIST_DIR?.trim() || ".next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  distDir: DIST_DIR,
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
  async redirects() {
    return [
      {
        source: "/admin/shows",
        destination: "/shows",
        permanent: false,
      },
      {
        source: "/admin/trr-shows",
        destination: "/shows",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        // Canonical shows routes
        { source: "/shows", destination: "/admin/trr-shows" },
        { source: "/shows/:showId/overview", destination: "/shows/:showId?tab=details" },
        { source: "/shows/:showId/details", destination: "/shows/:showId?tab=details" },
        { source: "/shows/:showId/settings", destination: "/shows/:showId?tab=settings" },
        { source: "/shows/:showId/seasons", destination: "/shows/:showId?tab=seasons" },
        { source: "/shows/:showId/news", destination: "/shows/:showId?tab=news" },
        { source: "/shows/:showId/cast", destination: "/shows/:showId?tab=cast" },
        { source: "/shows/:showId/surveys", destination: "/shows/:showId?tab=surveys" },
        { source: "/shows/:showId/media", destination: "/shows/:showId?tab=assets&assets=images" },
        { source: "/shows/:showId/media/videos", destination: "/shows/:showId?tab=assets&assets=videos" },
        { source: "/shows/:showId/media/brand", destination: "/shows/:showId?tab=assets&assets=brand" },
        { source: "/shows/:showId/social", destination: "/shows/:showId?tab=social&social_view=bravo" },
        { source: "/shows/:showId/social/:network", destination: "/shows/:showId?tab=social&social_view=:network" },

        // Canonical season routes
        { source: "/shows/:showId/s:seasonNumber", destination: "/shows/:showId/seasons/:seasonNumber" },
        { source: "/shows/:showId/s:seasonNumber/overview", destination: "/shows/:showId/seasons/:seasonNumber?tab=overview" },
        { source: "/shows/:showId/s:seasonNumber/details", destination: "/shows/:showId/seasons/:seasonNumber?tab=overview" },
        { source: "/shows/:showId/s:seasonNumber/episodes", destination: "/shows/:showId/seasons/:seasonNumber?tab=episodes" },
        { source: "/shows/:showId/s:seasonNumber/media", destination: "/shows/:showId/seasons/:seasonNumber?tab=assets&assets=media" },
        { source: "/shows/:showId/s:seasonNumber/media/brand", destination: "/shows/:showId/seasons/:seasonNumber?tab=assets&assets=brand" },
        { source: "/shows/:showId/s:seasonNumber/videos", destination: "/shows/:showId/seasons/:seasonNumber?tab=videos" },
        { source: "/shows/:showId/s:seasonNumber/fandom", destination: "/shows/:showId/seasons/:seasonNumber?tab=fandom" },
        { source: "/shows/:showId/s:seasonNumber/cast", destination: "/shows/:showId/seasons/:seasonNumber?tab=cast" },
        { source: "/shows/:showId/s:seasonNumber/surveys", destination: "/shows/:showId/seasons/:seasonNumber?tab=surveys" },
        { source: "/shows/:showId/s:seasonNumber/social", destination: "/shows/:showId/seasons/:seasonNumber?tab=social&social_view=bravo" },
        { source: "/shows/:showId/s:seasonNumber/social/:network", destination: "/shows/:showId/seasons/:seasonNumber?tab=social&social_view=:network" },
        { source: "/shows/:showId/s:seasonNumber/social/week/:weekIndex", destination: "/shows/:showId/seasons/:seasonNumber/social/week/:weekIndex" },

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
