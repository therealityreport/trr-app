import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getAssetsByShowIdMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getAssetsByShowIdMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  getAssetsByShowId: getAssetsByShowIdMock,
}));

import { GET } from "@/app/api/admin/trr-api/shows/[showId]/assets/route";

describe("show assets route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getAssetsByShowIdMock.mockReset();
    requireAdminMock.mockResolvedValue(undefined);
  });

  it("supports full fetch mode with truthful truncation metadata", async () => {
    const assets = Array.from({ length: 5001 }, (_, idx) => ({
      id: `asset-${idx + 1}`,
      hosted_url: `https://cdn.example.com/${idx + 1}.jpg`,
    }));
    getAssetsByShowIdMock.mockResolvedValue(assets);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/shows/show-1/assets?full=1"),
      { params: Promise.resolve({ showId: "show-1" }) }
    );

    expect(response.status).toBe(200);
    expect(getAssetsByShowIdMock).toHaveBeenCalledWith("show-1", {
      limit: 5001,
      offset: 0,
      sources: [],
      full: true,
    });

    const body = await response.json();
    expect(body.pagination).toMatchObject({
      limit: 5000,
      offset: 0,
      count: 5000,
      truncated: true,
      full: true,
    });
    expect(body.assets).toHaveLength(5000);
  });
});
