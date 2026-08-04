import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchAdminBackendJsonMock, MockAdminReadProxyError } = vi.hoisted(() => {
  class TestAdminReadProxyError extends Error {
    status: number;
    code?: string;

    constructor(message: string, status: number, options?: { code?: string }) {
      super(message);
      this.status = status;
      this.code = options?.code;
    }
  }
  return {
    fetchAdminBackendJsonMock: vi.fn(),
    MockAdminReadProxyError: TestAdminReadProxyError,
  };
});

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  AdminReadProxyError: MockAdminReadProxyError,
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS: 5_000,
  buildAdminBackendStatusError: ({ fallbackMessage, status }: { fallbackMessage: string; status: number }) =>
    new MockAdminReadProxyError(fallbackMessage, status),
}));

import {
  getCoveredShows,
  parseCoveredShowsPayload,
} from "@/lib/server/admin/covered-shows-repository";

const coveredShow = {
  id: "00000000-0000-0000-0000-000000000010",
  trr_show_id: "00000000-0000-0000-0000-000000000011",
  show_name: "Vanderpump Rules",
  canonical_slug: "vanderpump-rules",
  alternative_names: null,
  show_total_episodes: 12,
  poster_url: null,
};

describe("covered shows backend repository adapter", () => {
  beforeEach(() => {
    fetchAdminBackendJsonMock.mockReset();
  });

  it("loads the strict v2 contract without a local SQL fallback", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { shows: [coveredShow] },
      durationMs: 5,
    });
    const adminContext = {
      uid: "admin-user",
      email: "admin@example.com",
      verifiedAt: 1_700_000_000_000,
    };

    await expect(getCoveredShows({ adminContext })).resolves.toEqual([coveredShow]);
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/covered-shows",
      expect.objectContaining({
        apiVersion: "v2",
        adminContext,
      }),
    );
  });

  it("rejects backend rows outside the exact seven-field contract", () => {
    expect(() =>
      parseCoveredShowsPayload({
        shows: [{ ...coveredShow, created_by_firebase_uid: "unexpected" }],
      }),
    ).toThrowError(expect.objectContaining({ status: 502, code: "INVALID_BACKEND_RESPONSE" }));
  });
});
