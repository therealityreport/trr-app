import { createHmac } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildInternalAdminHeaders,
  getInternalAdminBearerToken,
  resolveVerifiedAdminContext,
} from "@/lib/server/trr-api/internal-admin-auth";

const decodeJwtPayload = (token: string): Record<string, unknown> => {
  const [, payload] = token.split(".");
  if (!payload) {
    throw new Error("missing jwt payload");
  }
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
};

describe("internal-admin-auth", () => {
  beforeEach(() => {
    process.env.TRR_INTERNAL_ADMIN_SHARED_SECRET = "internal-secret-for-tests";
    process.env.TRR_INTERNAL_ADMIN_JWT_ISSUER = "test-issuer";
    process.env.TRR_INTERNAL_ADMIN_JWT_AUDIENCE = "test-audience";
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.TRR_INTERNAL_ADMIN_SHARED_SECRET;
    delete process.env.TRR_INTERNAL_ADMIN_JWT_ISSUER;
    delete process.env.TRR_INTERNAL_ADMIN_JWT_AUDIENCE;
  });

  it("buildInternalAdminHeaders forwards only bearer auth", () => {
    const expectedToken = getInternalAdminBearerToken();

    const headers = buildInternalAdminHeaders({
      Accept: "application/json",
    });

    expect(headers.get("Authorization")).toBe(`Bearer ${expectedToken}`);
    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.get("X-TRR-Internal-Admin-Secret")).toBeNull();
  });

  it("buildInternalAdminHeaders strips any caller-supplied secret header", () => {
    const headers = buildInternalAdminHeaders({
      Accept: "application/json",
      "X-TRR-Internal-Admin-Secret": "caller-secret",
    });

    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.get("X-TRR-Internal-Admin-Secret")).toBeNull();
  });

  it("buildInternalAdminHeaders strips both legacy secret header spellings case-insensitively", () => {
    const headers = buildInternalAdminHeaders({
      Authorization: "Bearer caller-token",
      "x-trr-internal-admin-secret": "caller-secret",
      "X-Internal-Admin-Secret": "legacy-caller-secret",
    });

    expect(headers.get("Authorization")).toMatch(/^Bearer /);
    expect(headers.get("x-trr-internal-admin-secret")).toBeNull();
    expect(headers.get("X-Internal-Admin-Secret")).toBeNull();
  });

  it("getInternalAdminBearerToken reads issuer and audience at mint time", () => {
    process.env.TRR_INTERNAL_ADMIN_JWT_ISSUER = "issuer-one";
    process.env.TRR_INTERNAL_ADMIN_JWT_AUDIENCE = "audience-one";
    const firstClaims = decodeJwtPayload(getInternalAdminBearerToken());

    process.env.TRR_INTERNAL_ADMIN_JWT_ISSUER = "issuer-two";
    process.env.TRR_INTERNAL_ADMIN_JWT_AUDIENCE = "audience-two";
    const secondClaims = decodeJwtPayload(getInternalAdminBearerToken());

    expect(firstClaims.iss).toBe("issuer-one");
    expect(firstClaims.aud).toBe("audience-one");
    expect(secondClaims.iss).toBe("issuer-two");
    expect(secondClaims.aud).toBe("audience-two");
    expect(firstClaims.sub).toBe("trr-app-internal-admin");
    expect(secondClaims.scope).toBe("internal_admin");
  });

  it("preserves verified admin context in minted headers", () => {
    const headers = buildInternalAdminHeaders(
      {
        uid: "admin-123",
        email: "admin@example.com",
        verifiedAt: 1_700_000_000_000,
      },
      {
        Accept: "application/json",
      },
    );

    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.get("x-trr-admin-uid")).toBe("admin-123");
    expect(headers.get("x-trr-admin-email")).toBe("admin@example.com");
    expect(headers.get("x-trr-admin-verified-at")).toBe("1700000000000");
    expect(resolveVerifiedAdminContext(headers)).toEqual({
      uid: "admin-123",
      email: "admin@example.com",
      verifiedAt: 1_700_000_000_000,
    });
  });

  it("rejects malformed tokens with extra segments", () => {
    const headers = buildInternalAdminHeaders(
      {
        uid: "admin-123",
        email: "admin@example.com",
        verifiedAt: 1_700_000_000_000,
      },
      {},
    );
    headers.set("Authorization", `${headers.get("Authorization")}.extra`);

    expect(resolveVerifiedAdminContext(headers)).toBeNull();
  });

  it("requires the token host to match when an expected host is supplied", () => {
    const headers = buildInternalAdminHeaders(
      {
        uid: "admin-123",
        email: "admin@example.com",
        verifiedAt: 1_700_000_000_000,
      },
      { host: "admin.localhost:3000" },
    );

    expect(resolveVerifiedAdminContext(headers, "admin.localhost:3000")).toEqual({
      uid: "admin-123",
      email: "admin@example.com",
      verifiedAt: 1_700_000_000_000,
    });
    expect(resolveVerifiedAdminContext(headers, "localhost:3000")).toBeNull();
  });

  it("rejects tokens whose header does not declare HS256 even when the signature matches", () => {
    const headers = buildInternalAdminHeaders(
      {
        uid: "admin-123",
        email: "admin@example.com",
        verifiedAt: 1_700_000_000_000,
      },
      {},
    );
    const token = headers.get("Authorization")!.slice("Bearer ".length);
    const [, payload] = token.split(".");
    // Re-sign with the real secret so only the declared alg differs.
    const forgedHeader = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" }), "utf8").toString(
      "base64url",
    );
    const forgedSignature = createHmac("sha256", "internal-secret-for-tests")
      .update(`${forgedHeader}.${payload}`)
      .digest("base64url");
    headers.set("Authorization", `Bearer ${forgedHeader}.${payload}.${forgedSignature}`);

    expect(resolveVerifiedAdminContext(headers)).toBeNull();
  });
});
