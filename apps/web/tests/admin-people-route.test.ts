import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, searchPeopleMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  searchPeopleMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  searchPeople: searchPeopleMock,
}));

import { GET } from "@/app/api/admin/trr-api/people/route";

describe("/api/admin/trr-api/people", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    searchPeopleMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
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
    expect(searchPeopleMock).toHaveBeenCalledWith("al", { limit: 20, offset: 0 });
    expect(payload.pagination).toMatchObject({ limit: 20, offset: 0 });
  });
});
