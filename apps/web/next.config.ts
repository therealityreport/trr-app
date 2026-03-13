import type { NextConfig } from "next";

const IS_DEV = process.env.NODE_ENV === "development";
const DIST_DIR = process.env.NEXT_DIST_DIR?.trim() || ".next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  distDir: DIST_DIR,
  onDemandEntries: IS_DEV
    ? {
        // Keep a wider set of admin routes warm in dev so multiple open tabs do
        // not constantly fall out of Next's page buffer and trigger cold recompiles.
        maxInactiveAge: 15 * 60 * 1000,
        pagesBufferLength: 25,
      }
    : undefined,
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
        hostname: "pub-a3c452f3df0d40319f7c585253a4776c.r2.dev",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/:showId/s:seasonNumber(\\d+)/social/w:weekIndex(\\d+)/overview",
        destination: "/:showId/s:seasonNumber/social/w:weekIndex/details",
        permanent: false,
      },
      {
        source: "/:showId/s:seasonNumber(\\d+)/social/week/:weekIndex(\\d+)/overview",
        destination: "/:showId/s:seasonNumber/social/w:weekIndex/details",
        permanent: false,
      },
      {
        source: "/shows/:showId/:rest*",
        destination: "/:showId/:rest*",
        permanent: false,
      },
      {
        source: "/shows/:showId",
        destination: "/:showId",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        // Root-scoped season routes (canonical URL shape)
        // Canonical reddit community routes are handled by app aliases so
        // show slug + optional season stay in pathname params.
        // Community + window URLs under /:showId/social/reddit/:communitySlug/*
        // are handled by App Router aliases in src/app/[showId]/social/reddit/*
        // so route params stay available to the page layer.
        {
          source: "/:showId/social/official/reddit/:communitySlug/s:seasonNumber(\\d+)",
          destination: "/:showId/social/reddit/:communitySlug/s:seasonNumber",
        },
        {
          source: "/:showId/social/official/reddit/:communitySlug",
          destination: "/:showId/social/reddit/:communitySlug",
        },
        {
          source: "/:showId/s:seasonNumber(\\d+)/social/reddit/:communitySlug",
          destination: "/:showId/social/reddit/:communitySlug/s:seasonNumber",
        },
        {
          source: "/:showId/s:seasonNumber(\\d+)/social/official/reddit/:communitySlug",
          destination: "/:showId/social/reddit/:communitySlug/s:seasonNumber",
        },
        // Canonical shows routes
        { source: "/shows/:showId/overview", destination: "/shows/:showId?tab=details" },
        { source: "/shows/:showId/details", destination: "/shows/:showId?tab=details" },
        { source: "/shows/:showId/settings", destination: "/shows/:showId?tab=settings" },
        { source: "/shows/:showId/seasons", destination: "/shows/:showId?tab=seasons" },
        { source: "/shows/:showId/news", destination: "/shows/:showId?tab=news" },
        { source: "/shows/:showId/cast", destination: "/shows/:showId?tab=cast" },
        { source: "/shows/:showId/surveys", destination: "/shows/:showId?tab=surveys" },
        { source: "/shows/:showId/media", destination: "/shows/:showId?tab=assets&assets=images" },
        { source: "/shows/:showId/media/images", destination: "/shows/:showId?tab=assets&assets=images" },
        { source: "/shows/:showId/media/videos", destination: "/shows/:showId?tab=assets&assets=videos" },
        { source: "/shows/:showId/media/brand", destination: "/shows/:showId?tab=assets&assets=branding" },
        { source: "/shows/:showId/social", destination: "/shows/:showId?tab=social&social_view=official" },
        { source: "/shows/:showId/social/:network", destination: "/shows/:showId?tab=social&social_view=:network" },
        { source: "/shows/:showId/social/:network/:rest*", destination: "/shows/:showId?tab=social&social_view=:network" },

        // Canonical season routes
        { source: "/shows/:showId/s:seasonNumber", destination: "/shows/:showId/seasons/:seasonNumber" },
        { source: "/shows/:showId/s:seasonNumber/overview", destination: "/shows/:showId/seasons/:seasonNumber?tab=overview" },
        { source: "/shows/:showId/s:seasonNumber/details", destination: "/shows/:showId/seasons/:seasonNumber?tab=overview" },
        { source: "/shows/:showId/s:seasonNumber/episodes", destination: "/shows/:showId/seasons/:seasonNumber?tab=episodes" },
        { source: "/shows/:showId/s:seasonNumber/media", destination: "/shows/:showId/seasons/:seasonNumber?tab=assets&assets=images" },
        { source: "/shows/:showId/s:seasonNumber/media/brand", destination: "/shows/:showId/seasons/:seasonNumber?tab=assets&assets=branding" },
        { source: "/shows/:showId/s:seasonNumber/videos", destination: "/shows/:showId/seasons/:seasonNumber?tab=assets&assets=videos" },
        { source: "/shows/:showId/s:seasonNumber/news", destination: "/shows/:showId/seasons/:seasonNumber?tab=news" },
        { source: "/shows/:showId/s:seasonNumber/fandom", destination: "/shows/:showId/seasons/:seasonNumber?tab=fandom" },
        { source: "/shows/:showId/s:seasonNumber/cast", destination: "/shows/:showId/seasons/:seasonNumber?tab=cast" },
        { source: "/shows/:showId/s:seasonNumber/surveys", destination: "/shows/:showId/seasons/:seasonNumber?tab=surveys" },
        { source: "/shows/:showId/s:seasonNumber/social", destination: "/shows/:showId/seasons/:seasonNumber?tab=social&social_view=official" },
        { source: "/shows/:showId/s:seasonNumber/social/:network", destination: "/shows/:showId/seasons/:seasonNumber?tab=social&social_view=:network" },
        { source: "/shows/:showId/s:seasonNumber/social/:network/:rest*", destination: "/shows/:showId/seasons/:seasonNumber?tab=social&social_view=:network" },
        { source: "/shows/:showId/s:seasonNumber/social/week/:weekIndex", destination: "/shows/:showId/seasons/:seasonNumber/social/week/:weekIndex" },
        {
          source: "/shows/:showId/s:seasonNumber/social/week/:weekIndex/:platform",
          destination: "/shows/:showId/seasons/:seasonNumber/social/week/:weekIndex/:platform",
        },

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
        { source: "/admin/trr-shows/:showId/assets/brand", destination: "/admin/trr-shows/:showId?tab=assets&assets=branding" },
        { source: "/admin/trr-shows/:showId/assets/branding", destination: "/admin/trr-shows/:showId?tab=assets&assets=branding" },

        // Season tabs
        {
          source: "/admin/trr-shows/:showId/seasons/:seasonNumber/episodes",
          destination: "/admin/trr-shows/:showId/seasons/:seasonNumber?tab=episodes",
        },
        {
          source: "/admin/trr-shows/:showId/seasons/:seasonNumber/assets",
          destination: "/admin/trr-shows/:showId/seasons/:seasonNumber?tab=assets&assets=images",
        },
        {
          source: "/admin/trr-shows/:showId/seasons/:seasonNumber/assets/media",
          destination: "/admin/trr-shows/:showId/seasons/:seasonNumber?tab=assets&assets=images",
        },
        {
          source: "/admin/trr-shows/:showId/seasons/:seasonNumber/assets/brand",
          destination: "/admin/trr-shows/:showId/seasons/:seasonNumber?tab=assets&assets=branding",
        },
        {
          source: "/admin/trr-shows/:showId/seasons/:seasonNumber/assets/videos",
          destination: "/admin/trr-shows/:showId/seasons/:seasonNumber?tab=assets&assets=videos",
        },
        {
          source: "/admin/trr-shows/:showId/seasons/:seasonNumber/assets/branding",
          destination: "/admin/trr-shows/:showId/seasons/:seasonNumber?tab=assets&assets=branding",
        },
        {
          source: "/admin/trr-shows/:showId/seasons/:seasonNumber/videos",
          destination: "/admin/trr-shows/:showId/seasons/:seasonNumber?tab=assets&assets=videos",
        },
        {
          source: "/admin/trr-shows/:showId/seasons/:seasonNumber/news",
          destination: "/admin/trr-shows/:showId/seasons/:seasonNumber?tab=news",
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
