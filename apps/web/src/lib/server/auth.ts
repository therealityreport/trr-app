import "server-only";
import { Buffer } from "node:buffer";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { NextRequest } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "@/lib/firebaseAdmin";
import { DEFAULT_ADMIN_DISPLAY_NAMES, DEFAULT_ADMIN_UIDS } from "@/lib/admin/constants";
import { normalizeDisplayNameKey } from "@/lib/admin/display-names";

export type AuthProvider = "firebase" | "supabase";
export type AuthTokenClaims = {
  uid: string;
  sub?: string;
  email?: string;
  name?: string;
  [key: string]: unknown;
};

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  provider: AuthProvider;
  token: AuthTokenClaims;
}

const DEV_ADMIN_BYPASS_UID = "dev-admin-bypass";
const DEV_ADMIN_BYPASS_EMAIL = "dev-admin@localhost";
const DEFAULT_DEV_ADMIN_ALLOWED_HOSTS = ["admin.localhost", "localhost", "127.0.0.1", "[::1]", "::1"];
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

type TokenKind = "id" | "session";
type ShadowMismatchField = "uid" | "email" | "name";

interface AuthDiagnosticsCounters {
  shadowChecks: number;
  shadowFailures: number;
  shadowMismatchEvents: number;
  shadowMismatchFieldCounts: Record<ShadowMismatchField, number>;
  fallbackSuccesses: number;
}

interface PersistedAuthDiagnosticsState {
  windowStartedAt: string;
  lastObservedAt: string | null;
  counters: AuthDiagnosticsCounters;
}

export interface AuthDiagnosticsSnapshot {
  provider: AuthProvider;
  shadowMode: boolean;
  windowStartedAt: string;
  lastObservedAt: string | null;
  allowlistSizes: {
    emails: number;
    uids: number;
    displayNames: number;
  };
  counters: AuthDiagnosticsCounters;
}

const AUTH_PROVIDER: AuthProvider =
  (process.env.TRR_AUTH_PROVIDER ?? "firebase").trim().toLowerCase() === "supabase"
    ? "supabase"
    : "firebase";
const AUTH_SHADOW_MODE = (process.env.TRR_AUTH_SHADOW_MODE ?? "false").toLowerCase() === "true";

const USE_EMULATORS = (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS ?? "false").toLowerCase() === "true";
const HAS_SERVICE_ACCOUNT = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT) || USE_EMULATORS;
const FIREBASE_WEB_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
const AUTH_DIAGNOSTICS_PERSIST_ENABLED =
  (process.env.TRR_AUTH_DIAGNOSTICS_PERSIST ?? "true").toLowerCase() !== "false" &&
  process.env.NODE_ENV !== "test";
const AUTH_DIAGNOSTICS_STORE_FILE = resolve(
  process.cwd(),
  process.env.TRR_AUTH_DIAGNOSTICS_STORE_FILE ?? ".cache/auth-diagnostics.json",
);
let authDiagnosticsWindowStartedAt = new Date().toISOString();
let authDiagnosticsLastObservedAt: string | null = null;
const authDiagnosticsCounters: AuthDiagnosticsCounters = {
  shadowChecks: 0,
  shadowFailures: 0,
  shadowMismatchEvents: 0,
  shadowMismatchFieldCounts: {
    uid: 0,
    email: 0,
    name: 0,
  },
  fallbackSuccesses: 0,
};
let authDiagnosticsLoaded = false;

function _buildAuthDiagnosticsState(): PersistedAuthDiagnosticsState {
  return {
    windowStartedAt: authDiagnosticsWindowStartedAt,
    lastObservedAt: authDiagnosticsLastObservedAt,
    counters: {
      shadowChecks: authDiagnosticsCounters.shadowChecks,
      shadowFailures: authDiagnosticsCounters.shadowFailures,
      shadowMismatchEvents: authDiagnosticsCounters.shadowMismatchEvents,
      shadowMismatchFieldCounts: {
        uid: authDiagnosticsCounters.shadowMismatchFieldCounts.uid,
        email: authDiagnosticsCounters.shadowMismatchFieldCounts.email,
        name: authDiagnosticsCounters.shadowMismatchFieldCounts.name,
      },
      fallbackSuccesses: authDiagnosticsCounters.fallbackSuccesses,
    },
  };
}

function _persistAuthDiagnosticsState(): void {
  if (!AUTH_DIAGNOSTICS_PERSIST_ENABLED) return;
  try {
    mkdirSync(dirname(AUTH_DIAGNOSTICS_STORE_FILE), { recursive: true });
    writeFileSync(
      AUTH_DIAGNOSTICS_STORE_FILE,
      JSON.stringify(_buildAuthDiagnosticsState(), null, 2),
      "utf8",
    );
  } catch (error) {
    console.warn("[auth] Failed to persist diagnostics snapshot", error);
  }
}

function _loadAuthDiagnosticsStateIfNeeded(): void {
  if (authDiagnosticsLoaded || !AUTH_DIAGNOSTICS_PERSIST_ENABLED) return;
  authDiagnosticsLoaded = true;
  try {
    if (!existsSync(AUTH_DIAGNOSTICS_STORE_FILE)) return;
    const payload = JSON.parse(readFileSync(AUTH_DIAGNOSTICS_STORE_FILE, "utf8")) as Partial<PersistedAuthDiagnosticsState>;
    if (typeof payload.windowStartedAt === "string" && payload.windowStartedAt.trim()) {
      authDiagnosticsWindowStartedAt = payload.windowStartedAt;
    }
    authDiagnosticsLastObservedAt =
      typeof payload.lastObservedAt === "string" && payload.lastObservedAt.trim()
        ? payload.lastObservedAt
        : null;
    const counters = payload.counters;
    if (counters && typeof counters === "object") {
      authDiagnosticsCounters.shadowChecks = Number(counters.shadowChecks ?? 0) || 0;
      authDiagnosticsCounters.shadowFailures = Number(counters.shadowFailures ?? 0) || 0;
      authDiagnosticsCounters.shadowMismatchEvents = Number(counters.shadowMismatchEvents ?? 0) || 0;
      authDiagnosticsCounters.fallbackSuccesses = Number(counters.fallbackSuccesses ?? 0) || 0;
      const mismatch = counters.shadowMismatchFieldCounts ?? {};
      authDiagnosticsCounters.shadowMismatchFieldCounts.uid = Number(mismatch.uid ?? 0) || 0;
      authDiagnosticsCounters.shadowMismatchFieldCounts.email = Number(mismatch.email ?? 0) || 0;
      authDiagnosticsCounters.shadowMismatchFieldCounts.name = Number(mismatch.name ?? 0) || 0;
    }
  } catch (error) {
    console.warn("[auth] Failed to load diagnostics snapshot", error);
  }
}

function markAuthDiagnosticsObservedNow(): void {
  authDiagnosticsLastObservedAt = new Date().toISOString();
  _persistAuthDiagnosticsState();
}

function parseTokenFromRequest(request: NextRequest): { token: string; kind: TokenKind } | null {
  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return { token: authHeader.slice(7).trim(), kind: "id" };
  }
  const cookieToken = request.cookies.get("__session")?.value;
  if (cookieToken) {
    return { token: cookieToken, kind: "session" };
  }
  return null;
}

async function verifyFirebaseToken(token: string, kind: TokenKind): Promise<AuthTokenClaims | null> {
  if (!token) return null;
  if (kind === "id" && !HAS_SERVICE_ACCOUNT) {
    const fallback = await verifyIdTokenWithoutAdmin(token);
    if (fallback) return fallback;
  }
  try {
    if (kind === "session") {
      return (await adminAuth.verifySessionCookie(token, true)) as AuthTokenClaims;
    }
    return (await adminAuth.verifyIdToken(token, true)) as AuthTokenClaims;
  } catch (error) {
    console.error("[auth] Failed to verify token", error);
    if (kind === "id") {
      return verifyIdTokenWithoutAdmin(token);
    }
    return null;
  }
}

async function verifySupabaseToken(token: string): Promise<AuthTokenClaims | null> {
  const supabaseUrl = process.env.TRR_CORE_SUPABASE_URL;
  const supabaseServiceRoleKey =
    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return null;
  }

  try {
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) {
      return null;
    }

    const user = data.user;
    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
    const displayName =
      (typeof metadata.full_name === "string" && metadata.full_name.trim()) ||
      (typeof metadata.name === "string" && metadata.name.trim()) ||
      undefined;

    return {
      uid: user.id,
      sub: user.id,
      email: user.email ?? undefined,
      name: displayName,
      app_metadata: user.app_metadata ?? {},
      user_metadata: metadata,
      provider_identities: user.identities ?? [],
    } as AuthTokenClaims;
  } catch (error) {
    console.error("[auth] Failed Supabase token verification", error);
    return null;
  }
}

async function verifyIdTokenWithoutAdmin(token: string): Promise<AuthTokenClaims | null> {
  if (!FIREBASE_WEB_API_KEY) return null;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken: token }),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      console.warn("[auth] Identity Toolkit lookup failed", res.status, text);
      return null;
    }
    const data = (await res.json()) as { users?: Array<{ localId?: string; email?: string }> };
    const userInfo = data.users?.[0];
    const uid =
      (typeof payload.user_id === "string" && payload.user_id) ||
      (typeof payload.sub === "string" && payload.sub) ||
      userInfo?.localId;
    if (!uid) return null;
    const decoded: DecodedIdToken = {
      ...(payload as Record<string, unknown>),
      uid,
      aud: typeof payload.aud === "string" ? payload.aud : "",
      auth_time: typeof payload.auth_time === "number" ? payload.auth_time : Math.floor(Date.now() / 1000),
      exp: typeof payload.exp === "number" ? payload.exp : Math.floor(Date.now() / 1000) + 3600,
      iat: typeof payload.iat === "number" ? payload.iat : Math.floor(Date.now() / 1000),
      iss: typeof payload.iss === "string" ? payload.iss : "",
      sub: typeof payload.sub === "string" ? payload.sub : uid,
      firebase:
        (payload.firebase as DecodedIdToken["firebase"]) ??
        ({
          identities: {},
          sign_in_provider: "custom",
        } as DecodedIdToken["firebase"]),
    } as DecodedIdToken;
    if (userInfo?.email || typeof payload.email === "string") {
      decoded.email = userInfo?.email ?? (payload.email as string);
    }
    return decoded as AuthTokenClaims;
  } catch (error) {
    console.error("[auth] Failed fallback token verification", error);
    return null;
  }
}

async function verifyWithProvider(
  provider: AuthProvider,
  token: string,
  kind: TokenKind,
): Promise<AuthTokenClaims | null> {
  if (provider === "supabase") {
    return verifySupabaseToken(token);
  }
  return verifyFirebaseToken(token, kind);
}

function _normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function _summarizeClaims(claims: AuthTokenClaims): { uid: string; email: string | null; name: string | null } {
  return {
    uid: claims.uid,
    email: _normalizeOptionalString(claims.email),
    name: _normalizeOptionalString(claims.name),
  };
}

function _shadowParityMismatches(
  primaryClaims: AuthTokenClaims,
  shadowClaims: AuthTokenClaims,
): ShadowMismatchField[] {
  const mismatches: ShadowMismatchField[] = [];
  const primary = _summarizeClaims(primaryClaims);
  const shadow = _summarizeClaims(shadowClaims);

  if (primary.uid !== shadow.uid) {
    mismatches.push("uid");
  }
  if (primary.email !== shadow.email) {
    mismatches.push("email");
  }
  if (primary.name !== shadow.name) {
    mismatches.push("name");
  }
  return mismatches;
}

async function verifyToken(
  token: string,
  kind: TokenKind,
): Promise<{ provider: AuthProvider; claims: AuthTokenClaims } | null> {
  if (!token) return null;
  _loadAuthDiagnosticsStateIfNeeded();

  const primary = AUTH_PROVIDER;
  const secondary: AuthProvider = primary === "firebase" ? "supabase" : "firebase";

  const primaryClaims = await verifyWithProvider(primary, token, kind);
  if (primaryClaims?.uid) {
    if (AUTH_SHADOW_MODE) {
      authDiagnosticsCounters.shadowChecks += 1;
      markAuthDiagnosticsObservedNow();
      const shadowClaims = await verifyWithProvider(secondary, token, kind);
      if (!shadowClaims?.uid) {
        authDiagnosticsCounters.shadowFailures += 1;
        markAuthDiagnosticsObservedNow();
        console.warn("[auth] Shadow verification failed", { primary, secondary, kind });
      } else {
        const mismatches = _shadowParityMismatches(primaryClaims, shadowClaims);
        if (mismatches.length > 0) {
          authDiagnosticsCounters.shadowMismatchEvents += 1;
          for (const mismatch of mismatches) {
            authDiagnosticsCounters.shadowMismatchFieldCounts[mismatch] += 1;
          }
          markAuthDiagnosticsObservedNow();
          console.warn("[auth] Shadow verification mismatch", {
            primary,
            secondary,
            kind,
            mismatches,
            primary_summary: _summarizeClaims(primaryClaims),
            shadow_summary: _summarizeClaims(shadowClaims),
          });
        }
      }
    }
    return { provider: primary, claims: primaryClaims };
  }

  const fallbackClaims = await verifyWithProvider(secondary, token, kind);
  if (fallbackClaims?.uid) {
    authDiagnosticsCounters.fallbackSuccesses += 1;
    markAuthDiagnosticsObservedNow();
    console.warn("[auth] Auth provider fallback succeeded", { primary, secondary, kind });
    return { provider: secondary, claims: fallbackClaims };
  }

  return null;
}

function isLocalHostname(value: string | null | undefined): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return (
    LOOPBACK_HOSTS.has(normalized) ||
    normalized.endsWith(".localhost")
  );
}

function isLoopbackHost(value: string | null | undefined): boolean {
  if (!value) return false;
  return LOOPBACK_HOSTS.has(value.trim().toLowerCase());
}

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

function parseHostAllowlist(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((entry) => normalizeHost(entry))
      .filter((entry): entry is string => Boolean(entry)),
  );
}

function resolveDefaultAdminOrigin(): string | null {
  if (process.env.NODE_ENV === "development") return "http://admin.localhost:3000";
  return null;
}

function resolveAdminAllowedHosts(): Set<string> {
  const hosts = parseHostAllowlist(process.env.ADMIN_APP_HOSTS);
  if (hosts.size === 0 && process.env.NODE_ENV === "development") {
    for (const host of DEFAULT_DEV_ADMIN_ALLOWED_HOSTS) {
      const normalizedHost = normalizeHost(host);
      if (normalizedHost) hosts.add(normalizedHost);
    }
  }
  const configuredOrigin = process.env.ADMIN_APP_ORIGIN?.trim() || resolveDefaultAdminOrigin();
  if (configuredOrigin) {
    try {
      const originHost = normalizeHost(new URL(configuredOrigin).hostname);
      if (originHost) hosts.add(originHost);
    } catch {
      // Ignore invalid origin values; host allowlist can still come from ADMIN_APP_HOSTS.
    }
  }
  return hosts;
}

function isAdminHostEnforced(): boolean {
  const explicit = parseOptionalBoolean(process.env.ADMIN_ENFORCE_HOST);
  if (explicit !== null) return explicit;
  return true;
}

const adminAllowedHosts = resolveAdminAllowedHosts();

function isRequestHostAllowedForAdmin(request: NextRequest): boolean {
  if (!isAdminHostEnforced()) return true;
  if (adminAllowedHosts.size === 0) return false;

  const requestHost = normalizeHost(request.headers.get("host")) ?? normalizeHost(request.nextUrl.hostname);
  if (!requestHost) return false;
  if (adminAllowedHosts.has(requestHost)) return true;
  if (!isLoopbackHost(requestHost)) return false;
  return Array.from(adminAllowedHosts).some((allowedHost) => isLoopbackHost(allowedHost));
}

function isDevAdminBypassEnabled(request: NextRequest): boolean {
  const explicitBypass = parseOptionalBoolean(process.env.TRR_DEV_ADMIN_BYPASS);
  const bypassEnabled = explicitBypass ?? process.env.NODE_ENV === "development";
  if (!bypassEnabled) return false;
  const requestHost = request.nextUrl.hostname;
  if (isLocalHostname(requestHost)) return true;
  const hostHeader = request.headers.get("host");
  if (!hostHeader) return false;
  const hostWithoutPort = hostHeader.split(":")[0] ?? hostHeader;
  return isLocalHostname(hostWithoutPort);
}

function buildDevBypassUser(provider: AuthProvider = "firebase"): AuthenticatedUser {
  const token: AuthTokenClaims = {
    uid: DEV_ADMIN_BYPASS_UID,
    sub: DEV_ADMIN_BYPASS_UID,
    email: DEV_ADMIN_BYPASS_EMAIL,
    name: "Dev Admin Bypass",
  };
  return {
    uid: DEV_ADMIN_BYPASS_UID,
    email: DEV_ADMIN_BYPASS_EMAIL,
    provider,
    token,
  };
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payload = Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function getUserFromRequest(request: NextRequest): Promise<AuthenticatedUser | null> {
  const parsed = parseTokenFromRequest(request);
  if (!parsed) return null;
  const verified = await verifyToken(parsed.token, parsed.kind);
  if (!verified?.claims?.uid) return null;
  return {
    uid: verified.claims.uid,
    email: verified.claims.email,
    provider: verified.provider,
    token: verified.claims,
  };
}

export async function requireUser(request: NextRequest): Promise<AuthenticatedUser> {
  const user = await getUserFromRequest(request);
  if (!user) {
    throw new Error("unauthorized");
  }
  return user;
}

function parseAllowlist(raw: string | undefined, lowercase = true): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((entry) => {
        const trimmed = entry.trim();
        return lowercase ? trimmed.toLowerCase() : trimmed;
      })
      .filter(Boolean),
  );
}

const allowedEmails = new Set<string>([
  ...parseAllowlist(process.env.ADMIN_EMAIL_ALLOWLIST, true),
  // Keep server + client allowlists aligned in dev/prod; this reduces misconfig footguns.
  ...parseAllowlist(process.env.NEXT_PUBLIC_ADMIN_EMAILS, true),
]);

const allowedUids = new Set<string>([
  ...DEFAULT_ADMIN_UIDS,
  ...parseAllowlist(process.env.ADMIN_UID_ALLOWLIST, false),
  ...parseAllowlist(process.env.NEXT_PUBLIC_ADMIN_UIDS, false),
]);

const allowedDisplayNameKeys = new Set<string>(
  [
    ...DEFAULT_ADMIN_DISPLAY_NAMES,
    ...parseAllowlist(process.env.ADMIN_DISPLAYNAME_ALLOWLIST, false),
    ...parseAllowlist(process.env.NEXT_PUBLIC_ADMIN_DISPLAY_NAMES, false),
  ]
    .map((value) => normalizeDisplayNameKey(value))
    .filter((value): value is string => Boolean(value)),
);

export function getAuthDiagnosticsSnapshot(): AuthDiagnosticsSnapshot {
  _loadAuthDiagnosticsStateIfNeeded();
  return {
    provider: AUTH_PROVIDER,
    shadowMode: AUTH_SHADOW_MODE,
    windowStartedAt: authDiagnosticsWindowStartedAt,
    lastObservedAt: authDiagnosticsLastObservedAt,
    allowlistSizes: {
      emails: allowedEmails.size,
      uids: allowedUids.size,
      displayNames: allowedDisplayNameKeys.size,
    },
    counters: {
      shadowChecks: authDiagnosticsCounters.shadowChecks,
      shadowFailures: authDiagnosticsCounters.shadowFailures,
      shadowMismatchEvents: authDiagnosticsCounters.shadowMismatchEvents,
      shadowMismatchFieldCounts: {
        uid: authDiagnosticsCounters.shadowMismatchFieldCounts.uid,
        email: authDiagnosticsCounters.shadowMismatchFieldCounts.email,
        name: authDiagnosticsCounters.shadowMismatchFieldCounts.name,
      },
      fallbackSuccesses: authDiagnosticsCounters.fallbackSuccesses,
    },
  };
}

export function resetAuthDiagnosticsSnapshot(): AuthDiagnosticsSnapshot {
  _loadAuthDiagnosticsStateIfNeeded();
  authDiagnosticsWindowStartedAt = new Date().toISOString();
  authDiagnosticsLastObservedAt = null;
  authDiagnosticsCounters.shadowChecks = 0;
  authDiagnosticsCounters.shadowFailures = 0;
  authDiagnosticsCounters.shadowMismatchEvents = 0;
  authDiagnosticsCounters.shadowMismatchFieldCounts.uid = 0;
  authDiagnosticsCounters.shadowMismatchFieldCounts.email = 0;
  authDiagnosticsCounters.shadowMismatchFieldCounts.name = 0;
  authDiagnosticsCounters.fallbackSuccesses = 0;
  _persistAuthDiagnosticsState();

  return getAuthDiagnosticsSnapshot();
}

export async function requireAdmin(request: NextRequest): Promise<AuthenticatedUser> {
  if (!isRequestHostAllowedForAdmin(request)) {
    throw new Error("forbidden");
  }

  if (isDevAdminBypassEnabled(request)) {
    const parsed = parseTokenFromRequest(request);
    if (parsed?.token.trim() === "dev-admin-bypass") {
      return buildDevBypassUser();
    }
    const existingUser = await getUserFromRequest(request);
    return existingUser ?? buildDevBypassUser();
  }

  const user = await requireUser(request);
  const email = user.email?.toLowerCase();
  const emailAllowed = Boolean(email && allowedEmails.has(email));
  const uidAllowed = Boolean(user.uid && allowedUids.has(user.uid));
  const displayName = typeof user.token.name === "string" ? user.token.name : undefined;
  const displayNameKey = normalizeDisplayNameKey(displayName);
  const displayNameAllowed = Boolean(displayNameKey && allowedDisplayNameKeys.has(displayNameKey));
  const isAllowed = emailAllowed || uidAllowed || displayNameAllowed;
  if (!isAllowed) {
    throw new Error("forbidden");
  }
  return user;
}
