import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { captureExpectedConsoleWarn } from "./helpers/expected-console";

const {
  requireAdminMock,
  fetchSocialBackendJsonMock,
  socialProxyErrorResponseMock,
  queryMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  fetchSocialBackendJsonMock: vi.fn(),
  socialProxyErrorResponseMock: vi.fn(),
  queryMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/social-admin-proxy", () => {
  class SocialProxyError extends Error {
    status: number;
    code: string;
    retryable: boolean;

    constructor(
      message: string,
      options: { status: number; code: string; retryable?: boolean },
    ) {
      super(message);
      this.status = options.status;
      this.code = options.code;
      this.retryable = Boolean(options.retryable);
    }
  }
  return {
    fetchSocialBackendJson: fetchSocialBackendJsonMock,
    SocialProxyError,
    socialProxyErrorResponse: socialProxyErrorResponseMock,
  };
});

vi.mock("@/lib/server/postgres", () => ({
  query: queryMock,
}));

import { GET } from "@/app/api/admin/trr-api/social/shared/sources/route";

describe("shared social sources route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockReset();
    queryMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: "admin-1" });
    fetchSocialBackendJsonMock.mockResolvedValue({ source_scope: "network", sources: [] });
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      NextResponse.json(
        { error: error instanceof Error ? error.message : "failed" },
        { status: 502 },
      ),
    );
    queryMock.mockResolvedValue({ rows: [] });
  });

  it("returns local Supabase shared-source rows when the backend proxy is unavailable", async () => {
    const expectedWarn = captureExpectedConsoleWarn(
      /^\[api\] Failed to fetch backend shared social account sources; using local fallback/,
    );
    fetchSocialBackendJsonMock.mockRejectedValue(new Error("fetch failed"));
    queryMock.mockResolvedValue({
      rows: [
        {
          id: "source-bravo",
          platform: "instagram",
          source_scope: "network",
          account_handle: "bravotv",
          is_active: true,
          scrape_priority: 10,
          metadata: {
            network_key: "bravo-tv",
            display_name: "Bravo TV",
          },
        },
      ],
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/trr-api/social/shared/sources?source_scope=network&include_inactive=true",
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-trr-shared-sources-fallback")).toBe("local-db");
    expect(payload).toEqual(
      expect.objectContaining({
        source_scope: "network",
        using_local_fallback: true,
        load_source: "local_db_fallback",
        backend_endpoint:
          "/shared/sources?source_scope=network&include_inactive=true",
        sources: [
          expect.objectContaining({
            platform: "instagram",
            account_handle: "bravotv",
          }),
        ],
      }),
    );
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("from social.shared_account_sources"),
      ["network"],
    );
    expectedWarn.expectCalled();
  });
});
