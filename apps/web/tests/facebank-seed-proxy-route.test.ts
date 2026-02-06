import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getBackendApiUrlMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getBackendApiUrlMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/backend", () => ({
  getBackendApiUrl: getBackendApiUrlMock,
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
    vi.restoreAllMocks();

    process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
    process.env.TRR_INTERNAL_ADMIN_SHARED_SECRET = "shared-internal-secret";
    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue("https://backend.example.com/api/v1/admin/person/person-1/gallery/link-1/facebank-seed");
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
      Authorization: "Bearer service-role-secret",
      "X-TRR-Internal-Admin-Secret": "shared-internal-secret",
      "Content-Type": "application/json",
    });
    expect(options.body).toBe(JSON.stringify({ facebank_seed: true }));
  });

  it("returns 500 when internal secret is missing", async () => {
    delete process.env.TRR_INTERNAL_ADMIN_SHARED_SECRET;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await PATCH(makeRequest({ facebank_seed: true }), {
      params: Promise.resolve({ personId: "person-1", linkId: "link-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBe("Internal backend auth secret not configured");
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
