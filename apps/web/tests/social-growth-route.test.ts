import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getBackendApiUrlMock, fetchMock, buildInternalAdminHeadersMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getBackendApiUrlMock: vi.fn(),
  fetchMock: vi.fn(),
  buildInternalAdminHeadersMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/backend", () => ({
  getBackendApiUrl: getBackendApiUrlMock,
}));

vi.mock("@/lib/server/trr-api/internal-admin-auth", () => ({
  buildInternalAdminHeaders: buildInternalAdminHeadersMock,
}));

import { GET } from "@/app/api/admin/trr-api/people/[personId]/social-growth/route";

describe("social growth person proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getBackendApiUrlMock.mockReset();
    fetchMock.mockReset();
    buildInternalAdminHeadersMock.mockReset();

    requireAdminMock.mockResolvedValue(undefined);
    getBackendApiUrlMock.mockReturnValue("http://backend/api/v1/admin/people/person-1/socialblade?handle=heathergay");
    buildInternalAdminHeadersMock.mockReturnValue(
      new Headers({
        Authorization: "Bearer test-admin-token",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses canonical internal admin headers for backend reads", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ username: "heathergay" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/people/person-1/social-growth?handle=heathergay",
    );

    const response = await GET(request, {
      params: Promise.resolve({ personId: "person-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ username: "heathergay" });
    expect(buildInternalAdminHeadersMock).toHaveBeenCalledWith();
    expect(getBackendApiUrlMock).toHaveBeenCalledWith(
      "/admin/people/person-1/socialblade?handle=heathergay",
    );
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: new Headers({
        Authorization: "Bearer test-admin-token",
      }),
    });
  });

  it("returns backend auth not configured when internal admin headers cannot be built", async () => {
    buildInternalAdminHeadersMock.mockImplementation(() => {
      throw new Error("TRR_INTERNAL_ADMIN_SHARED_SECRET is not configured");
    });

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/people/person-1/social-growth?handle=heathergay",
    );

    const response = await GET(request, {
      params: Promise.resolve({ personId: "person-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload).toEqual({ error: "Backend auth not configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
