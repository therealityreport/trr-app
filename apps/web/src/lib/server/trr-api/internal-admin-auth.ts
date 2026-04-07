import "server-only";

import { createHmac } from "node:crypto";

const INTERNAL_ADMIN_SUBJECT = "trr-app-internal-admin";
const INTERNAL_ADMIN_SCOPE = "internal_admin";
const DEFAULT_INTERNAL_ADMIN_TTL_SECONDS = 120;

const base64UrlEncode = (value: string): string =>
  Buffer.from(value, "utf8").toString("base64url");

const signHs256 = (value: string, secret: string): string =>
  createHmac("sha256", secret).update(value).digest("base64url");

const getSigningSecret = (): string | null => {
  const secret = process.env.TRR_INTERNAL_ADMIN_SHARED_SECRET?.trim();
  return secret && secret.length > 0 ? secret : null;
};

const getInternalAdminIssuer = (): string =>
  process.env.TRR_INTERNAL_ADMIN_JWT_ISSUER?.trim() || "trr-app-internal";

const getInternalAdminAudience = (): string =>
  process.env.TRR_INTERNAL_ADMIN_JWT_AUDIENCE?.trim() || "trr-backend-internal-admin";

export const peekInternalAdminBearerToken = (): string | null => {
  const secret = getSigningSecret();
  if (!secret) return null;

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: getInternalAdminIssuer(),
    aud: getInternalAdminAudience(),
    sub: INTERNAL_ADMIN_SUBJECT,
    scope: INTERNAL_ADMIN_SCOPE,
    iat: now,
    nbf: now,
    exp: now + DEFAULT_INTERNAL_ADMIN_TTL_SECONDS,
  };

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

export const getInternalAdminBearerToken = (): string => {
  const token = peekInternalAdminBearerToken();
  if (!token) {
    throw new Error("TRR_INTERNAL_ADMIN_SHARED_SECRET is not configured");
  }
  return token;
};

export const buildInternalAdminHeaders = (
  extraHeaders?: HeadersInit,
): Headers => {
  const token = getInternalAdminBearerToken();
  const headers = new Headers(extraHeaders);
  headers.delete("X-TRR-Internal-Admin-Secret");
  headers.delete("X-Internal-Admin-Secret");
  headers.set("Authorization", `Bearer ${token}`);
  return headers;
};
