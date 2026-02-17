import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getFandomDataByPersonIdMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getFandomDataByPersonIdMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  getFandomDataByPersonId: getFandomDataByPersonIdMock,
}));

import { GET } from "@/app/api/admin/trr-api/people/[personId]/fandom/route";

describe("person fandom route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getFandomDataByPersonIdMock.mockReset();
    requireAdminMock.mockResolvedValue(undefined);
    getFandomDataByPersonIdMock.mockResolvedValue([]);
  });

  it("forwards showId query param to repository for show-scoped relationship fallback", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/people/person-1/fandom?showId=show-123"
    );

    const response = await GET(request, {
      params: Promise.resolve({ personId: "person-1" }),
    });

    expect(response.status).toBe(200);
    expect(getFandomDataByPersonIdMock).toHaveBeenCalledWith("person-1", {
      showId: "show-123",
    });
  });
});
