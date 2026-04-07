import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getBackendApiUrlMock, getInternalAdminBearerTokenMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getBackendApiUrlMock: vi.fn(),
  getInternalAdminBearerTokenMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/backend", () => ({
  getBackendApiUrl: getBackendApiUrlMock,
}));

vi.mock("@/lib/server/trr-api/internal-admin-auth", () => ({
  getInternalAdminBearerToken: getInternalAdminBearerTokenMock,
}));

import { PATCH } from "@/app/api/admin/trr-api/people/[personId]/gallery/[linkId]/facebank-seed/route";

const makeRequest = (body: Record<string, unknown>) =>
  new NextRequest("http://localhost/api/admin/trr-api/people/person-1/gallery/link-1/facebank-seed", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("facebank seed proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    getInternalAdminBearerTokenMock.mockReset();
    vi.restoreAllMocks();

    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue("https://backend.example.com/api/v1/admin/person/person-1/gallery/link-1/facebank-seed");
    getInternalAdminBearerTokenMock.mockReturnValue("internal-admin-token");
  });

  it("forwards PATCH with service role + internal secret headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          link_id: "link-1",
          person_id: "person-1",
          facebank_seed: true,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await PATCH(makeRequest({ facebank_seed: true }), {
      params: Promise.resolve({ personId: "person-1", linkId: "link-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.facebank_seed).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://backend.example.com/api/v1/admin/person/person-1/gallery/link-1/facebank-seed",
    );
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    expect(options.method).toBe("PATCH");
    expect(options.headers).toMatchObject({
      Authorization: "Bearer internal-admin-token",
      "Content-Type": "application/json",
    });
    expect(options.body).toBe(JSON.stringify({ facebank_seed: true }));
  });

  it("returns 500 when internal secret is missing", async () => {
    getInternalAdminBearerTokenMock.mockImplementation(() => {
      throw new Error("TRR_INTERNAL_ADMIN_SHARED_SECRET is not configured");
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await PATCH(makeRequest({ facebank_seed: true }), {
      params: Promise.resolve({ personId: "person-1", linkId: "link-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBe("TRR_INTERNAL_ADMIN_SHARED_SECRET is not configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("passes through backend status and error payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ detail: "person mismatch" }), {
        status: 409,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await PATCH(makeRequest({ facebank_seed: true }), {
      params: Promise.resolve({ personId: "person-1", linkId: "link-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toBe("person mismatch");
  });
});
