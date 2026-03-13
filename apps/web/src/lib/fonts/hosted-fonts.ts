export const NEXT_PUBLIC_HOSTED_FONT_BASE_URL = "NEXT_PUBLIC_HOSTED_FONT_BASE_URL";

export const DEFAULT_HOSTED_FONT_BASE_URL =
  "https://pub-a3c452f3df0d40319f7c585253a4776c.r2.dev";

export const LEGACY_CLOUDFRONT_FONT_BASE_URL =
  "https://d1fmdyqfafwim3.cloudfront.net";

export interface HostedFontPreload {
  assetPath: string;
  type: string;
}

export const HOSTED_FONT_PRELOADS: HostedFontPreload[] = [
  {
    assetPath: "/fonts/monotype/Hamburg%20Serial/HamburgSerial-930108065.otf",
    type: "font/otf",
  },
  {
    assetPath: "/fonts/monotype/Gloucester/GloucesterOldStyle-5735713.ttf",
    type: "font/ttf",
  },
] as const;

export function normalizeHostedFontBaseUrl(value: string | null | undefined): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return DEFAULT_HOSTED_FONT_BASE_URL;
  return trimmed.replace(/\/+$/, "");
}

export function getHostedFontBaseUrl(envValue = process.env.NEXT_PUBLIC_HOSTED_FONT_BASE_URL): string {
  return normalizeHostedFontBaseUrl(envValue);
}

export function buildHostedFontUrl(
  assetPath: string,
  baseUrl = getHostedFontBaseUrl(),
): string {
  return `${normalizeHostedFontBaseUrl(baseUrl)}${buildHostedFontAssetPath(assetPath)}`;
}

export function buildHostedFontAssetPath(assetPath: string): string {
  return assetPath.startsWith("/") ? assetPath : `/${assetPath}`;
}
