import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  listPersonExternalIdsMock,
  syncPersonExternalIdsMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  listPersonExternalIdsMock: vi.fn(),
  syncPersonExternalIdsMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  listPersonExternalIds: listPersonExternalIdsMock,
  syncPersonExternalIds: syncPersonExternalIdsMock,
}));

import {
  GET,
  PUT,
} from "@/app/api/admin/trr-api/people/[personId]/external-ids/route";

describe("person external ids route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    listPersonExternalIdsMock.mockReset();
    syncPersonExternalIdsMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-user" });
  });

  it("lists normalized external ids and forwards includeInactive", async () => {
    listPersonExternalIdsMock.mockResolvedValue([
      {
        id: "row-1",
        person_id: "person-1",
        source_id: "imdb",
        external_id: "nm1234567",
        is_primary: true,
        valid_from: null,
        valid_to: null,
        observed_at: null,
      },
    ]);

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/trr-api/people/person-1/external-ids?includeInactive=true"
      ),
      { params: Promise.resolve({ personId: "person-1" }) }
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(listPersonExternalIdsMock).toHaveBeenCalledWith("person-1", {
      includeInactive: true,
    });
    expect(payload.external_ids).toHaveLength(1);
    expect(payload.external_ids[0]).toMatchObject({
      source_id: "imdb",
      external_id: "nm1234567",
    });
  });

  it("syncs normalized external ids for supported sources", async () => {
    syncPersonExternalIdsMock.mockResolvedValue([
      {
        id: "row-1",
        person_id: "person-1",
        source_id: "tmdb",
        external_id: "1686599",
        is_primary: true,
        valid_from: null,
        valid_to: null,
        observed_at: null,
      },
    ]);

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/people/person-1/external-ids",
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          external_ids: [
            {
              source_id: "tmdb",
              external_id: "1686599",
            },
          ],
        }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ personId: "person-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(syncPersonExternalIdsMock).toHaveBeenCalledWith("person-1", [
      {
        source_id: "tmdb",
        external_id: "1686599",
        valid_to: null,
        valid_from: null,
        is_primary: true,
      },
    ]);
    expect(payload.external_ids).toHaveLength(1);
  });

  it("rejects unsupported sources with a 400", async () => {
    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/people/person-1/external-ids",
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          external_ids: [{ source_id: "letterboxd", external_id: "demo" }],
        }),
      }
    );

    const response = await PUT(request, {
      params: Promise.resolve({ personId: "person-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Unsupported source: letterboxd");
    expect(syncPersonExternalIdsMock).not.toHaveBeenCalled();
  });
});
