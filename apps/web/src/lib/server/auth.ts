import "server-only";
import { Buffer } from "node:buffer";
import type { NextRequest } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "@/lib/firebaseAdmin";
import { DEFAULT_ADMIN_DISPLAY_NAMES, DEFAULT_ADMIN_UIDS } from "@/lib/admin/constants";
import { normalizeDisplayName, normalizeDisplayNameKey } from "@/lib/admin/display-names";

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  token: DecodedIdToken;
}

type TokenKind = "id" | "session";

const USE_EMULATORS = (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS ?? "false").toLowerCase() === "true";
const HAS_SERVICE_ACCOUNT = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT) || USE_EMULATORS;
const FIREBASE_WEB_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";

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

async function verifyToken(token: string, kind: TokenKind): Promise<DecodedIdToken | null> {
  if (!token) return null;
  if (kind === "id" && !HAS_SERVICE_ACCOUNT) {
    const fallback = await verifyIdTokenWithoutAdmin(token);
    if (fallback) return fallback;
  }
  try {
    if (kind === "session") {
      return await adminAuth.verifySessionCookie(token, true);
    }
    return await adminAuth.verifyIdToken(token, true);
  } catch (error) {
    console.error("[auth] Failed to verify token", error);
    if (kind === "id") {
      return verifyIdTokenWithoutAdmin(token);
    }
    return null;
  }
}

async function verifyIdTokenWithoutAdmin(token: string): Promise<DecodedIdToken | null> {
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
    return decoded;
  } catch (error) {
    console.error("[auth] Failed fallback token verification", error);
    return null;
  }
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
  const decoded = await verifyToken(parsed.token, parsed.kind);
  if (!decoded?.uid) return null;
  return { uid: decoded.uid, email: decoded.email, token: decoded };
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

const emailAllowlist = parseAllowlist(process.env.ADMIN_EMAIL_ALLOWLIST, true);
const fallbackEmailAllowlist = parseAllowlist(process.env.NEXT_PUBLIC_ADMIN_EMAILS, true);
const envUidAllowlist = parseAllowlist(process.env.ADMIN_UID_ALLOWLIST, false);
const displayNameAllowlist = parseAllowlist(process.env.ADMIN_DISPLAYNAME_ALLOWLIST, false);
const fallbackDisplayNames = parseAllowlist(process.env.NEXT_PUBLIC_ADMIN_DISPLAY_NAMES, false);

const uidAllowlist = new Set<string>([...envUidAllowlist, ...DEFAULT_ADMIN_UIDS]);

const allowedEmails = new Set<string>([...emailAllowlist, ...fallbackEmailAllowlist]);
const allowedDisplayNames = new Set<string>(
  [
    ...DEFAULT_ADMIN_DISPLAY_NAMES,
    ...displayNameAllowlist,
    ...fallbackDisplayNames,
  ]
    .map((value) => normalizeDisplayName(value))
    .filter((value): value is string => Boolean(value)),
);
const allowedDisplayNameKeys = new Set<string>(
  Array.from(allowedDisplayNames)
    .map((value) => normalizeDisplayNameKey(value))
    .filter((value): value is string => Boolean(value)),
);

const allowAllAdmins =
  allowedEmails.size === 0 && uidAllowlist.size === 0 && allowedDisplayNames.size === 0 && allowedDisplayNameKeys.size === 0;

export async function requireAdmin(request: NextRequest): Promise<AuthenticatedUser> {
  const user = await requireUser(request);
  if (allowAllAdmins) {
    console.warn("[auth] ADMIN_EMAIL_ALLOWLIST is empty; allowing any authenticated user to access admin APIs.");
    return user;
  }
  const email = user.email?.toLowerCase();
  const displayName =
    typeof user.token.name === "string"
      ? user.token.name
      : typeof (user.token as { displayName?: string }).displayName === "string"
        ? (user.token as { displayName?: string }).displayName
        : undefined;
  const normalizedDisplayName = normalizeDisplayName(displayName);
  const normalizedDisplayNameKey = normalizeDisplayNameKey(normalizedDisplayName);
  const isAllowed =
    (email && allowedEmails.has(email)) ||
    uidAllowlist.has(user.uid) ||
    (normalizedDisplayName ? allowedDisplayNames.has(normalizedDisplayName) : false) ||
    (normalizedDisplayNameKey ? allowedDisplayNameKeys.has(normalizedDisplayNameKey) : false);
  if (!isAllowed) {
    throw new Error("forbidden");
  }
  return user;
}
