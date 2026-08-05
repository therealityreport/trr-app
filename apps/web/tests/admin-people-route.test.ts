import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { AdminReadProxyError } from "@/lib/server/trr-api/admin-read-proxy";

const { requireAdminMock, searchPeopleMock, toVerifiedAdminContextMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  searchPeopleMock: vi.fn(),
  toVerifiedAdminContextMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
  toVerifiedAdminContext: toVerifiedAdminContextMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  searchPeople: searchPeopleMock,
}));

import { GET } from "@/app/api/admin/trr-api/people/route";

describe("/api/admin/trr-api/people", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    searchPeopleMock.mockReset();
    toVerifiedAdminContextMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
    toVerifiedAdminContextMock.mockReturnValue({
      uid: "admin-user",
      email: null,
      verifiedAt: 1_789_000_000_000,
    });
    searchPeopleMock.mockResolvedValue([]);
  });

  it("rejects malformed explicit limit values before searching", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/people?q=al&limit=abc"),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("limit must be an integer");
    expect(searchPeopleMock).not.toHaveBeenCalled();
  });

  it("rejects malformed explicit offset values before searching", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/people?q=al&offset=abc"),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("offset must be an integer");
    expect(searchPeopleMock).not.toHaveBeenCalled();
  });

  it("clamps valid out-of-range pagination values", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/people?q=al&limit=999&offset=-4"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(searchPeopleMock).toHaveBeenCalledWith("al", {
      limit: 20,
      offset: 0,
      adminContext: {
        uid: "admin-user",
        email: null,
        verifiedAt: 1_789_000_000_000,
      },
    });
    expect(payload.pagination).toMatchObject({ limit: 20, offset: 0 });
  });

  it("preserves typed retryable backend failures", async () => {
    searchPeopleMock.mockRejectedValue(
      new AdminReadProxyError("People store unavailable", 503, {
        code: "DATABASE_SERVICE_UNAVAILABLE",
        retryable: true,
      }),
    );

    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/people?q=al"),
    );
    const payload = await response.json();

    expect(response.status).toBe(503);
    expect(payload).toEqual({
      error: "People store unavailable",
      code: "DATABASE_SERVICE_UNAVAILABLE",
      retryable: true,
    });
  });
});
