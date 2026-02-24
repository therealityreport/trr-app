import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, getPhotosByPersonIdMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  getPhotosByPersonIdMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  getPhotosByPersonId: getPhotosByPersonIdMock,
}));

import { GET } from "@/app/api/admin/trr-api/people/[personId]/photos/route";

describe("person gallery broken filter route wiring", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    getPhotosByPersonIdMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
    getPhotosByPersonIdMock.mockResolvedValue([]);
  });

  it("defaults includeBroken to false", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/people/person-1/photos?limit=25&offset=10&sources=imdb,fandom",
      { method: "GET" }
    );

    const response = await GET(request, { params: Promise.resolve({ personId: "person-1" }) });
    expect(response.status).toBe(200);
    expect(getPhotosByPersonIdMock).toHaveBeenCalledWith("person-1", {
      limit: 25,
      offset: 10,
      sources: ["imdb", "fandom"],
      includeBroken: false,
    });
  });

  it("passes includeBroken=true when query flag is enabled", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/people/person-1/photos?include_broken=true",
      { method: "GET" }
    );

    const response = await GET(request, { params: Promise.resolve({ personId: "person-1" }) });
    expect(response.status).toBe(200);
    expect(getPhotosByPersonIdMock).toHaveBeenCalledWith("person-1", {
      limit: 100,
      offset: 0,
      sources: [],
      includeBroken: true,
    });
  });
});
