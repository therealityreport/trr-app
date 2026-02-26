import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  listPaletteLibraryEntriesByShowMock,
  createPaletteLibraryEntryMock,
  deletePaletteLibraryEntryByIdMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  listPaletteLibraryEntriesByShowMock: vi.fn(),
  createPaletteLibraryEntryMock: vi.fn(),
  deletePaletteLibraryEntryByIdMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/shows/shows-repository", () => ({
  listPaletteLibraryEntriesByShow: listPaletteLibraryEntriesByShowMock,
  createPaletteLibraryEntry: createPaletteLibraryEntryMock,
  deletePaletteLibraryEntryById: deletePaletteLibraryEntryByIdMock,
}));

import { GET, POST } from "@/app/api/admin/shows/palette-library/route";
import { DELETE } from "@/app/api/admin/shows/palette-library/[paletteId]/route";

const SHOW_ID = "11111111-1111-4111-8111-111111111111";
const PALETTE_ID = "22222222-2222-4222-8222-222222222222";

describe("palette library routes", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    listPaletteLibraryEntriesByShowMock.mockReset();
    createPaletteLibraryEntryMock.mockReset();
    deletePaletteLibraryEntryByIdMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
  });

  it("validates GET query params", async () => {
    const invalidResponse = await GET(
      new NextRequest("http://localhost/api/admin/shows/palette-library?trrShowId=bad-id"),
    );
    expect(invalidResponse.status).toBe(400);

    listPaletteLibraryEntriesByShowMock.mockResolvedValue([{ id: PALETTE_ID }]);
    const validResponse = await GET(
      new NextRequest(
        `http://localhost/api/admin/shows/palette-library?trrShowId=${SHOW_ID}&seasonNumber=2`,
      ),
    );

    expect(validResponse.status).toBe(200);
    expect(listPaletteLibraryEntriesByShowMock).toHaveBeenCalledWith(SHOW_ID, {
      seasonNumber: 2,
      includeAllSeasonEntries: true,
    });
  });

  it("creates palette entries with authenticated uid", async () => {
    createPaletteLibraryEntryMock.mockResolvedValue({ id: PALETTE_ID, name: "Test", colors: ["#111111", "#222222", "#333333"] });

    const request = new NextRequest("http://localhost/api/admin/shows/palette-library", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        trrShowId: SHOW_ID,
        seasonNumber: null,
        name: "Test",
        colors: ["#111111", "#222222", "#333333"],
        sourceType: "upload",
        sourceImageUrl: null,
        seed: 18,
        markerPoints: [
          { x: 0.2, y: 0.3, radius: 12 },
          { x: 0.4, y: 0.5, radius: 12 },
          { x: 0.6, y: 0.7, radius: 12 },
        ],
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.entry.id).toBe(PALETTE_ID);
    expect(createPaletteLibraryEntryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        trrShowId: SHOW_ID,
        createdByUid: "admin-user",
      }),
    );
  });

  it("validates POST payload and DELETE id", async () => {
    const badPost = await POST(
      new NextRequest("http://localhost/api/admin/shows/palette-library", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ trrShowId: SHOW_ID }),
      }),
    );
    expect(badPost.status).toBe(400);

    const badDelete = await DELETE(new NextRequest("http://localhost"), {
      params: Promise.resolve({ paletteId: "bad-id" }),
    });
    expect(badDelete.status).toBe(400);

    deletePaletteLibraryEntryByIdMock.mockResolvedValue(true);
    const goodDelete = await DELETE(new NextRequest("http://localhost"), {
      params: Promise.resolve({ paletteId: PALETTE_ID }),
    });
    expect(goodDelete.status).toBe(200);
    expect(deletePaletteLibraryEntryByIdMock).toHaveBeenCalledWith(PALETTE_ID);
  });
});
