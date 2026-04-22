import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

const INTERNAL_ADMIN_SUBJECT = "trr-app-internal-admin";
const INTERNAL_ADMIN_SCOPE = "internal_admin";
const DEFAULT_INTERNAL_ADMIN_TTL_SECONDS = 120;

export type VerifiedAdminContext = {
  uid: string;
  email: string | null;
  verifiedAt: number;
};

type InternalAdminPayload = {
  iss?: unknown;
  aud?: unknown;
  sub?: unknown;
  scope?: unknown;
  iat?: unknown;
  nbf?: unknown;
  exp?: unknown;
  admin_uid?: unknown;
  admin_email?: unknown;
  verified_at?: unknown;
};

const base64UrlEncode = (value: string): string =>
  Buffer.from(value, "utf8").toString("base64url");

const base64UrlDecode = (value: string): string =>
  Buffer.from(value, "base64url").toString("utf8");

const signHs256 = (value: string, secret: string): string =>
  createHmac("sha256", secret).update(value).digest("base64url");

const isVerifiedAdminContext = (value: unknown): value is VerifiedAdminContext =>
  Boolean(value) &&
  typeof value === "object" &&
  typeof (value as VerifiedAdminContext).uid === "string" &&
  typeof (value as VerifiedAdminContext).verifiedAt === "number";

const getSigningSecret = (): string | null => {
  const secret = process.env.TRR_INTERNAL_ADMIN_SHARED_SECRET?.trim();
  return secret && secret.length > 0 ? secret : null;
};

const getInternalAdminIssuer = (): string =>
  process.env.TRR_INTERNAL_ADMIN_JWT_ISSUER?.trim() || "trr-app-internal";

const getInternalAdminAudience = (): string =>
  process.env.TRR_INTERNAL_ADMIN_JWT_AUDIENCE?.trim() || "trr-backend-internal-admin";

const readBearerToken = (headersLike: HeadersInit | Headers): string | null => {
  const headers = new Headers(headersLike);
  const authorization = headers.get("authorization") ?? headers.get("Authorization");
  if (!authorization) {
    return null;
  }
  const [scheme, token] = authorization.split(/\s+/, 2);
  if (scheme?.toLowerCase() !== "bearer" || !token?.trim()) {
    return null;
  }
  return token.trim();
};

const normalizeEmail = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  const normalized = value.trim();
  return normalized ? normalized : null;
};

const verifySignedPayload = (token: string, secret: string): InternalAdminPayload | null => {
  const [encodedHeader, encodedPayload, signature] = token.split(".");
  if (!encodedHeader || !encodedPayload || !signature) {
    return null;
  }
  const expectedSignature = signHs256(`${encodedHeader}.${encodedPayload}`, secret);
  if (expectedSignature.length !== signature.length) {
    return null;
  }
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (!timingSafeEqual(provided, expected)) {
    return null;
  }
  try {
    const parsed = JSON.parse(base64UrlDecode(encodedPayload)) as InternalAdminPayload;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

export const peekInternalAdminBearerToken = (context?: VerifiedAdminContext): string | null => {
  const secret = getSigningSecret();
  if (!secret) return null;

  const now = Math.floor(Date.now() / 1000);
  const payload: Record<string, unknown> = {
    iss: getInternalAdminIssuer(),
    aud: getInternalAdminAudience(),
    sub: INTERNAL_ADMIN_SUBJECT,
    scope: INTERNAL_ADMIN_SCOPE,
    iat: now,
    nbf: now,
    exp: now + DEFAULT_INTERNAL_ADMIN_TTL_SECONDS,
  };
  if (context) {
    payload.admin_uid = context.uid;
    payload.admin_email = context.email;
    payload.verified_at = context.verifiedAt;
  }

  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const signature = signHs256(unsigned, secret);
  return `${unsigned}.${signature}`;
};

export const getInternalAdminBearerToken = (context?: VerifiedAdminContext): string => {
  const token = peekInternalAdminBearerToken(context);
  if (!token) {
    throw new Error("TRR_INTERNAL_ADMIN_SHARED_SECRET is not configured");
  }
  return token;
};

export const resolveVerifiedAdminContext = (
  headersLike: HeadersInit | Headers,
): VerifiedAdminContext | null => {
  const secret = getSigningSecret();
  if (!secret) {
    return null;
  }
  const token = readBearerToken(headersLike);
  if (!token) {
    return null;
  }
  const payload = verifySignedPayload(token, secret);
  if (!payload) {
    return null;
  }
  const now = Math.floor(Date.now() / 1000);
  if (
    payload.iss !== getInternalAdminIssuer() ||
    payload.aud !== getInternalAdminAudience() ||
    payload.sub !== INTERNAL_ADMIN_SUBJECT ||
    payload.scope !== INTERNAL_ADMIN_SCOPE ||
    typeof payload.nbf !== "number" ||
    typeof payload.exp !== "number" ||
    payload.nbf > now ||
    payload.exp <= now ||
    typeof payload.admin_uid !== "string" ||
    !payload.admin_uid.trim()
  ) {
    return null;
  }
  const verifiedAt =
    typeof payload.verified_at === "number" && Number.isFinite(payload.verified_at)
      ? payload.verified_at
      : null;
  if (verifiedAt === null) {
    return null;
  }
  return {
    uid: payload.admin_uid.trim(),
    email: normalizeEmail(payload.admin_email),
    verifiedAt,
  };
};

export const buildInternalAdminHeaders = (
  contextOrHeaders?: VerifiedAdminContext | HeadersInit,
  extraHeaders?: HeadersInit,
): Headers => {
  const context = isVerifiedAdminContext(contextOrHeaders) ? contextOrHeaders : undefined;
  const initialHeaders = isVerifiedAdminContext(contextOrHeaders) ? extraHeaders : contextOrHeaders;
  const token = getInternalAdminBearerToken(context);
  const headers = new Headers(initialHeaders);
  headers.delete("X-TRR-Internal-Admin-Secret");
  headers.delete("X-Internal-Admin-Secret");
  headers.set("Authorization", `Bearer ${token}`);
  if (context) {
    headers.set("x-trr-admin-uid", context.uid);
    if (context.email) {
      headers.set("x-trr-admin-email", context.email);
    } else {
      headers.delete("x-trr-admin-email");
    }
    headers.set("x-trr-admin-verified-at", String(context.verifiedAt));
  }
  return headers;
};
