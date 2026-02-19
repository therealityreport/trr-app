import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, updateMediaLinkContextByIdMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  updateMediaLinkContextByIdMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/media-links-repository", () => ({
  updateMediaLinkContextById: updateMediaLinkContextByIdMock,
}));

import { PATCH } from "@/app/api/admin/trr-api/media-links/[linkId]/context/route";

const makeRequest = (body: Record<string, unknown>) =>
  new NextRequest("http://localhost/api/admin/trr-api/media-links/link-1/context", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("media-link context route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    updateMediaLinkContextByIdMock.mockReset();
    requireAdminMock.mockResolvedValue(undefined);
  });

  it("patches safe context fields and returns normalized payload", async () => {
    updateMediaLinkContextByIdMock.mockResolvedValue({
      id: "link-1",
      context: {
        people_count: 3,
        people_count_source: "manual",
        thumbnail_crop: { x: 44, y: 31, zoom: 1.2, mode: "manual" },
      },
    });

    const response = await PATCH(
      makeRequest({
        people_count: 3,
        people_count_source: "manual",
        thumbnail_crop: { x: 44, y: 31, zoom: 1.2, mode: "manual" },
      }),
      { params: Promise.resolve({ linkId: "link-1" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(updateMediaLinkContextByIdMock).toHaveBeenCalledWith("link-1", {
      people_count: 3,
      people_count_source: "manual",
      thumbnail_crop: { x: 44, y: 31, zoom: 1.2, mode: "manual" },
    });
    expect(payload.people_count).toBe(3);
    expect(payload.people_count_source).toBe("manual");
    expect(payload.thumbnail_crop).toEqual({ x: 44, y: 31, zoom: 1.2, mode: "manual" });
  });

  it("rejects payloads with unsupported keys", async () => {
    const response = await PATCH(
      makeRequest({ not_allowed: true }),
      { params: Promise.resolve({ linkId: "link-1" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("Invalid payload");
    expect(updateMediaLinkContextByIdMock).not.toHaveBeenCalled();
  });

  it("returns 404 when media link is missing", async () => {
    updateMediaLinkContextByIdMock.mockResolvedValue(null);

    const response = await PATCH(
      makeRequest({ people_count: 2 }),
      { params: Promise.resolve({ linkId: "missing-link" }) }
    );

    expect(response.status).toBe(404);
  });
});

