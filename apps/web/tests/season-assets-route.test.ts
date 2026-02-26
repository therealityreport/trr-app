import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getAssetsByShowSeasonMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getAssetsByShowSeasonMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  getAssetsByShowSeason: getAssetsByShowSeasonMock,
}));

import { GET } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/assets/route";

describe("season assets route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getAssetsByShowSeasonMock.mockReset();
    requireAdminMock.mockResolvedValue(undefined);
  });

  it("supports full fetch mode with truthful truncation metadata", async () => {
    const assets = Array.from({ length: 5001 }, (_, idx) => ({
      id: `asset-${idx + 1}`,
      hosted_url: `https://cdn.example.com/${idx + 1}.jpg`,
    }));
    getAssetsByShowSeasonMock.mockResolvedValue(assets);

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/trr-api/shows/show-1/seasons/6/assets?full=true"
      ),
      { params: Promise.resolve({ showId: "show-1", seasonNumber: "6" }) }
    );

    expect(response.status).toBe(200);
    expect(getAssetsByShowSeasonMock).toHaveBeenCalledWith("show-1", 6, {
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
