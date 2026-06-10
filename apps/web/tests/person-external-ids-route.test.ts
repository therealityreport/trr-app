import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { captureExpectedConsoleError } from "./helpers/expected-console";

const {
  requireAdminMock,
  toVerifiedAdminContextMock,
  MockAdminReadProxyError,
  invalidateAdminBackendCacheMock,
  listPersonExternalIdsMock,
  syncPersonExternalIdsMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  toVerifiedAdminContextMock: vi.fn(),
  MockAdminReadProxyError: class AdminReadProxyError extends Error {
    status: number;

    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
  invalidateAdminBackendCacheMock: vi.fn(),
  listPersonExternalIdsMock: vi.fn(),
  syncPersonExternalIdsMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
  toVerifiedAdminContext: toVerifiedAdminContextMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  listPersonExternalIds: listPersonExternalIdsMock,
  syncPersonExternalIds: syncPersonExternalIdsMock,
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  AdminReadProxyError: MockAdminReadProxyError,
  invalidateAdminBackendCache: invalidateAdminBackendCacheMock,
}));

import {
  GET,
  PUT,
} from "@/app/api/admin/trr-api/people/[personId]/external-ids/route";

describe("person external ids route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    toVerifiedAdminContextMock.mockReset();
    invalidateAdminBackendCacheMock.mockReset();
    listPersonExternalIdsMock.mockReset();
    syncPersonExternalIdsMock.mockReset();
    requireAdminMock.mockResolvedValue({ uid: "admin-user", email: "admin@example.com" });
    toVerifiedAdminContextMock.mockReturnValue({
      uid: "admin-user",
      email: "admin@example.com",
      verifiedAt: 1_717_800_000_000,
    });
    invalidateAdminBackendCacheMock.mockResolvedValue(undefined);
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
    expect(syncPersonExternalIdsMock).toHaveBeenCalledWith(
      "person-1",
      [
        {
          source_id: "tmdb",
          external_id: "1686599",
          valid_to: null,
          valid_from: null,
          is_primary: true,
        },
      ],
      {
        adminContext: {
          uid: "admin-user",
          email: "admin@example.com",
          verifiedAt: 1_717_800_000_000,
        },
      },
    );
    expect(invalidateAdminBackendCacheMock).toHaveBeenCalledWith(
      "/admin/people/person-1/cache/invalidate",
      { routeName: "person-detail" },
    );
    expect(payload.external_ids).toHaveLength(1);
  });

  it("rejects unsupported sources with a 400", async () => {
    const expectedError = captureExpectedConsoleError(/^\[api\] Failed to sync person external IDs .*Unsupported source: letterboxd/);
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
    expectedError.expectCalled();
  });

  it("preserves backend sync conflict status", async () => {
    const expectedError = captureExpectedConsoleError(/^\[api\] Failed to sync person external IDs .*already assigned/);
    syncPersonExternalIdsMock.mockRejectedValue(
      new MockAdminReadProxyError("That external ID is already assigned to another person.", 409),
    );

    const request = new NextRequest(
      "http://localhost/api/admin/trr-api/people/person-1/external-ids",
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          external_ids: [{ source_id: "imdb", external_id: "nm1234567" }],
        }),
      },
    );

    const response = await PUT(request, {
      params: Promise.resolve({ personId: "person-1" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toBe("That external ID is already assigned to another person.");
    expectedError.expectCalled();
  });
});
