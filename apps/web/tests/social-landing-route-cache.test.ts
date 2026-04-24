import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";
import { SOCIAL_LANDING_CACHE_NAMESPACE } from "@/lib/server/admin/social-landing-route-cache";

const {
  requireAdminMock,
  toVerifiedAdminContextMock,
  getSocialLandingPayloadResultMock,
  fetchSocialBackendJsonMock,
  socialProxyErrorResponseMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  toVerifiedAdminContextMock: vi.fn(),
  getSocialLandingPayloadResultMock: vi.fn(),
  fetchSocialBackendJsonMock: vi.fn(),
  socialProxyErrorResponseMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
  toVerifiedAdminContext: toVerifiedAdminContextMock,
}));

vi.mock("@/lib/server/admin/social-landing-repository", () => ({
  getSocialLandingPayloadResult: getSocialLandingPayloadResultMock,
}));

vi.mock("@/lib/server/trr-api/social-admin-proxy", () => ({
  fetchSocialBackendJson: fetchSocialBackendJsonMock,
  socialProxyErrorResponse: socialProxyErrorResponseMock,
}));

vi.mock("@/lib/server/trr-api/trr-shows-repository", () => ({
  listPersonExternalIds: vi.fn(),
  getShowById: vi.fn(),
  syncPersonExternalIds: vi.fn(),
  updateShowById: vi.fn(),
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  invalidateAdminBackendCache: vi.fn(),
}));

vi.mock("@/lib/server/trr-api/trr-show-read-route-cache", () => ({
  invalidateTrrShowReadCaches: vi.fn(),
}));

import { GET as getLanding } from "@/app/api/admin/social/landing/route";
import { POST as postSharedIngest } from "@/app/api/admin/trr-api/social/shared/ingest/route";

const buildPayload = (label: string) => ({
  network_sets: [],
  show_sets: [{ show_id: label }],
  people_profiles: [],
  person_targets: [],
  cast_socialblade_shows: [],
  shared_pipeline: {
    sources: [],
    runs: [],
    review_items: [],
  },
  reddit_dashboard: {
    active_community_count: 0,
    archived_community_count: 0,
    show_count: 0,
  },
});

describe("social landing route cache", () => {
  beforeEach(() => {
    invalidateRouteResponseCache(SOCIAL_LANDING_CACHE_NAMESPACE);
    requireAdminMock.mockReset();
    toVerifiedAdminContextMock.mockReset();
    getSocialLandingPayloadResultMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockReset();

    requireAdminMock.mockResolvedValue({
      uid: "firebase-admin-1",
      email: "admin@example.com",
    });
    toVerifiedAdminContextMock.mockReturnValue({ uid: "firebase-admin-1" });
    fetchSocialBackendJsonMock.mockResolvedValue({
      message: "Shared ingest queued",
      run_id: "run-1",
    });
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      NextResponse.json(
        { error: error instanceof Error ? error.message : "failed" },
        { status: 502 },
      ),
    );
  });

  it("does not reuse a warmed landing cache after shared ingest invalidates it", async () => {
    getSocialLandingPayloadResultMock
      .mockResolvedValueOnce({ payload: buildPayload("before"), cacheable: true })
      .mockResolvedValueOnce({ payload: buildPayload("after"), cacheable: true });

    const landingRequest = new NextRequest("http://localhost/api/admin/social/landing");

    const first = await getLanding(landingRequest);
    const second = await getLanding(landingRequest);

    expect(first.status).toBe(200);
    expect(second.headers.get("x-trr-cache")).toBe("hit");
    expect((await second.json()).show_sets[0].show_id).toBe("before");
    expect(getSocialLandingPayloadResultMock).toHaveBeenCalledTimes(1);

    const ingestResponse = await postSharedIngest(
      new NextRequest("http://localhost/api/admin/trr-api/social/shared/ingest", {
        method: "POST",
        body: JSON.stringify({ source_scope: "bravo" }),
        headers: { "content-type": "application/json" },
      }),
    );
    expect(ingestResponse.status).toBe(200);

    const refreshed = await getLanding(landingRequest);
    const refreshedPayload = await refreshed.json();

    expect(refreshed.headers.get("x-trr-cache")).not.toBe("hit");
    expect(refreshedPayload.show_sets[0].show_id).toBe("after");
    expect(getSocialLandingPayloadResultMock).toHaveBeenCalledTimes(2);
  });

  it("bypasses warmed cache with refresh=1 and avoids route caching not-cacheable payloads", async () => {
    getSocialLandingPayloadResultMock
      .mockResolvedValueOnce({ payload: buildPayload("good"), cacheable: true })
      .mockResolvedValueOnce({ payload: buildPayload("fallback"), cacheable: false })
      .mockResolvedValueOnce({ payload: buildPayload("good-again"), cacheable: true });

    const baseRequest = new NextRequest("http://localhost/api/admin/social/landing");
    await getLanding(baseRequest);

    const fallbackResponse = await getLanding(
      new NextRequest("http://localhost/api/admin/social/landing?refresh=1"),
    );
    const fallbackPayload = await fallbackResponse.json();

    expect(fallbackResponse.headers.get("x-trr-cache")).toBe("refresh");
    expect(fallbackResponse.headers.get("x-trr-cacheable")).toBe("0");
    expect(fallbackPayload.show_sets[0].show_id).toBe("fallback");

    const nextResponse = await getLanding(baseRequest);
    const nextPayload = await nextResponse.json();

    expect(nextPayload.show_sets[0].show_id).toBe("good-again");
    expect(getSocialLandingPayloadResultMock).toHaveBeenCalledTimes(3);
  });
});
