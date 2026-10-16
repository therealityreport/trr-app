import "server-only";
import type { NextRequest } from "next/server";

function parseSessionOrigin(value: string | null | undefined): URL | null {
  // Origin contains only a scheme and authority, never credentials or a path.
  if (!value || !/^https?:\/\/[^/?#\\\s@,]+$/i.test(value) || value.endsWith(":")) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function matchesOriginHost(host: string, origin: URL): boolean {
  // Accept one Host authority; reject URL components and comma-separated values.
  if (!/^(?:\[[0-9a-f:.]+\]|[^:/?#\\\s@,]+)(?::[0-9]+)?$/i.test(host)) return false;
  try {
    return new URL(`${origin.protocol}//${host}`).host === origin.host;
  } catch {
    return false;
  }
}

export function isSameOriginSessionRequest(request: NextRequest): boolean {
  if (request.headers.get("sec-fetch-site")?.trim().toLowerCase() === "cross-site") {
    return false;
  }

  const origin = parseSessionOrigin(request.headers.get("origin"));
  if (!origin) return false;

  const host = request.headers.get("host");
  const hostMatches = host !== null && matchesOriginHost(host, origin);
  if (host !== null && !hostMatches) return false;
  if (origin.origin === request.nextUrl.origin) return true;

  // Portless keeps Next's canonical URL on the internal listener. Only explicit
  // external origins paired with their actual Host may use this proxy path.
  if (!hostMatches) return false;
  return [process.env.ADMIN_APP_ORIGIN, process.env.PORTLESS_APP_URL, process.env.PORTLESS_ADMIN_URL]
    .some((configured) => parseSessionOrigin(configured)?.origin === origin.origin);
}
