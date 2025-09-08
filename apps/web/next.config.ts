import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  turbopack: {
    root: __dirname, // ensure Turbopack uses this app as root
  },
};

export default nextConfig;