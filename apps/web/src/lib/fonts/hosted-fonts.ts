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
    assetPath: "/fonts/trr/Hamburg%20Serial/HamburgSerial-930108065.otf",
    type: "font/otf",
  },
  {
    assetPath: "/fonts/trr/Gloucester/GloucesterOldStyle-5735713.ttf",
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

export function normalizeHostedFontAssetPathFromUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/fonts/")) return buildHostedFontAssetPath(trimmed);

  const match = trimmed.match(/^https?:\/\/[^/]+(\/fonts\/[^?#"')]+)/i);
  if (!match?.[1]) return null;

  return buildHostedFontAssetPath(match[1]);
}

export function rewriteHostedFontCssUrls(template: string): string {
  return template.replace(/url\((['"]?)([^"')]+)\1\)/g, (fullMatch, quote, rawUrl) => {
    const assetPath = normalizeHostedFontAssetPathFromUrl(rawUrl);
    if (!assetPath) return fullMatch;
    return `url(${quote}${assetPath}${quote})`;
  });
}

export function extractHostedFontAssetLinks(
  stylesheet: string,
  baseUrl = getHostedFontBaseUrl(),
): Record<string, string> {
  const fontAssetLinks: Record<string, string> = {};
  const fontFacePattern =
    /@font-face\s*{[\s\S]*?font-family:\s*["']([^"']+)["'];[\s\S]*?src:\s*url\((['"]?)([^"')]+)\2\)/g;

  for (const match of stylesheet.matchAll(fontFacePattern)) {
    const familyName = match[1]?.trim();
    const rawUrl = match[3]?.trim();
    if (!familyName || !rawUrl || fontAssetLinks[familyName]) continue;

    const assetPath = normalizeHostedFontAssetPathFromUrl(rawUrl);
    fontAssetLinks[familyName] = assetPath
      ? buildHostedFontUrl(assetPath, baseUrl)
      : rawUrl;
  }

  return fontAssetLinks;
}
