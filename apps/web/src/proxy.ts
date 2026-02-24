import { NextResponse, type NextRequest } from "next/server";

const DEFAULT_DEV_ADMIN_ORIGIN = "http://admin.localhost:3000";
const STATIC_PATH_PREFIXES = ["/_next", "/favicon.ico", "/robots.txt", "/sitemap.xml"];
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function parseOptionalBoolean(value: string | undefined): boolean | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "on") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no" || normalized === "off") {
    return false;
  }
  return null;
}

function normalizeHost(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  // Bracketed IPv6 form from URL.hostname / Host header.
  if (normalized.startsWith("[")) {
    const closingBracket = normalized.indexOf("]");
    if (closingBracket >= 0) {
      return normalized.slice(0, closingBracket + 1);
    }
  }

  // host:port (single-colon non-IPv6 host)
  const firstColon = normalized.indexOf(":");
  const lastColon = normalized.lastIndexOf(":");
  if (firstColon > -1 && firstColon === lastColon) {
    const maybePort = normalized.slice(lastColon + 1);
    if (/^\d+$/.test(maybePort)) {
      return normalized.slice(0, lastColon);
    }
  }

  return normalized;
}

function resolveAdminOrigin(): string | null {
  const configuredOrigin = process.env.ADMIN_APP_ORIGIN?.trim();
  if (configuredOrigin) return configuredOrigin;
  if (process.env.NODE_ENV === "development") return DEFAULT_DEV_ADMIN_ORIGIN;
  return null;
}

function resolveAdminHost(adminOrigin: string | null): string | null {
  if (!adminOrigin) return null;
  try {
    return normalizeHost(new URL(adminOrigin).hostname);
  } catch {
    return null;
  }
}

function isLoopbackHost(host: string | null | undefined): boolean {
  if (!host) return false;
  return LOOPBACK_HOSTS.has(host);
}

function hostsMatch(expectedHost: string | null, requestHost: string | null): boolean {
  if (!expectedHost || !requestHost) return false;
  if (expectedHost === requestHost) return true;
  return isLoopbackHost(expectedHost) && isLoopbackHost(requestHost);
}

function isStaticPath(pathname: string): boolean {
  if (STATIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  return /\.[^/]+$/.test(pathname);
}

function isAdminUiPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

function isAdminApiPath(pathname: string): boolean {
  return pathname === "/api/admin" || pathname.startsWith("/api/admin/");
}

export function proxy(request: NextRequest): NextResponse {
  const enforceHost = parseOptionalBoolean(process.env.ADMIN_ENFORCE_HOST) ?? process.env.NODE_ENV === "production";
  if (!enforceHost) return NextResponse.next();

  const pathname = request.nextUrl.pathname;
  if (isStaticPath(pathname)) return NextResponse.next();

  const strictHostRouting = parseOptionalBoolean(process.env.ADMIN_STRICT_HOST_ROUTING) ?? false;
  const adminOrigin = resolveAdminOrigin();
  const adminHost = resolveAdminHost(adminOrigin);
  const requestHost = normalizeHost(request.headers.get("host")) ?? normalizeHost(request.nextUrl.hostname);
  const onAdminHost = hostsMatch(adminHost, requestHost);
  const onAdminUiPath = isAdminUiPath(pathname);
  const onAdminApiPath = isAdminApiPath(pathname);

  if (onAdminApiPath && !onAdminHost) {
    return NextResponse.json({ error: "Admin API is not available on this host." }, { status: 403 });
  }

  if (onAdminUiPath && !onAdminHost) {
    if (!adminOrigin) {
      return NextResponse.json({ error: "Admin origin is not configured." }, { status: 403 });
    }
    const redirectUrl = new URL(pathname + request.nextUrl.search, adminOrigin);
    return NextResponse.redirect(redirectUrl, 307);
  }

  if (strictHostRouting && onAdminHost && !onAdminUiPath && !onAdminApiPath) {
    if (!adminOrigin) {
      return NextResponse.json({ error: "Admin origin is not configured." }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/admin", adminOrigin), 307);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
