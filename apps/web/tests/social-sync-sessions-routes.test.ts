import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, fetchSeasonBackendJsonMock, fetchSeasonBackendResponseMock, socialProxyErrorResponseMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  fetchSeasonBackendJsonMock: vi.fn(),
  fetchSeasonBackendResponseMock: vi.fn(),
  socialProxyErrorResponseMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/social-admin-proxy", () => ({
  fetchSeasonBackendJson: fetchSeasonBackendJsonMock,
  fetchSeasonBackendResponse: fetchSeasonBackendResponseMock,
  socialProxyErrorResponse: socialProxyErrorResponseMock,
  SOCIAL_PROXY_DEFAULT_TIMEOUT_MS: 45_000,
  SOCIAL_PROXY_LONG_TIMEOUT_MS: 90_000,
}));

import { POST as createPOST } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/sync-sessions/route";
import { GET as getGET } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/sync-sessions/[syncSessionId]/route";
import { GET as streamGET } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/sync-sessions/[syncSessionId]/stream/route";
import { POST as cancelPOST } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/sync-sessions/[syncSessionId]/cancel/route";
import { POST as retryPOST } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/sync-sessions/[syncSessionId]/retry/route";

describe("social sync session proxy routes", () => {
  const showId = "11111111-1111-4111-8111-111111111111";
  const seasonId = "22222222-2222-4222-8222-222222222222";
  const syncSessionId = "33333333-3333-4333-8333-333333333333";

  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchSeasonBackendJsonMock.mockReset();
    fetchSeasonBackendResponseMock.mockReset();
    socialProxyErrorResponseMock.mockReset();

    requireAdminMock.mockResolvedValue(undefined);
    fetchSeasonBackendJsonMock.mockResolvedValue({ ok: true });
    fetchSeasonBackendResponseMock.mockResolvedValue(
      new Response('event: sync_session\ndata: {"sync_session":{"sync_session_id":"33333333-3333-4333-8333-333333333333","status":"completed","season_id":"22222222-2222-4222-8222-222222222222","source_scope":"bravo","platforms":["instagram"],"date_start":null,"date_end":null,"current_pass_kind":"details_refresh","current_pass_attempt":1,"current_run_id":null,"pass_sequence":3,"follow_up_reason":null,"pass_history":[],"completeness_snapshot":{"up_to_date":true}}}\n\n',
        {
          status: 200,
          headers: { "content-type": "text/event-stream; charset=utf-8" },
        },
      ),
    );
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      new Response(JSON.stringify({ error: String(error), code: "BACKEND_UNREACHABLE" }), {
        status: 502,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  it("forwards sync-session create requests with season_id hint and tab metadata", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/sync-sessions?season_id=${seasonId}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-trr-tab-session-id": "tab-123",
          "x-trr-flow-key": "flow-456",
        },
        body: JSON.stringify({ source_scope: "bravo", date_start: "2026-01-01T00:00:00Z", date_end: "2026-01-08T00:00:00Z" }),
      },
    );

    const response = await createPOST(request, { params: Promise.resolve({ showId, seasonNumber: "6" }) });

    expect(response.status).toBe(200);
    expect(fetchSeasonBackendJsonMock).toHaveBeenCalledWith(
      showId,
      "6",
      "/sync-sessions",
      expect.objectContaining({
        method: "POST",
        seasonIdHint: seasonId,
        retries: 0,
        timeoutMs: 210_000,
      }),
    );
    const body = String(fetchSeasonBackendJsonMock.mock.calls[0]?.[3]?.body ?? "");
    expect(body).toContain("\"client_session_id\":\"tab-123\"");
    expect(body).toContain("\"client_workflow_id\":\"flow-456\"");
  });

  it("forwards sync-session progress requests", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/sync-sessions/${syncSessionId}?season_id=${seasonId}&view=full`,
    );

    const response = await getGET(request, {
      params: Promise.resolve({ showId, seasonNumber: "6", syncSessionId }),
    });

    expect(response.status).toBe(200);
    expect(fetchSeasonBackendJsonMock).toHaveBeenCalledWith(
      showId,
      "6",
      `/sync-sessions/${syncSessionId}`,
      expect.objectContaining({
        seasonIdHint: seasonId,
        queryString: "view=full",
        retries: 0,
        timeoutMs: 45_000,
      }),
    );
  });

  it("forwards sync-session cancel requests", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/sync-sessions/${syncSessionId}/cancel?season_id=${seasonId}`,
      { method: "POST" },
    );

    const response = await cancelPOST(request, {
      params: Promise.resolve({ showId, seasonNumber: "6", syncSessionId }),
    });

    expect(response.status).toBe(200);
    expect(fetchSeasonBackendJsonMock).toHaveBeenCalledWith(
      showId,
      "6",
      `/sync-sessions/${syncSessionId}/cancel`,
      expect.objectContaining({
        method: "POST",
        seasonIdHint: seasonId,
        retries: 1,
        timeoutMs: 45_000,
      }),
    );
  });

  it("forwards sync-session stream requests", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/sync-sessions/${syncSessionId}/stream?season_id=${seasonId}&view=live`,
    );

    const response = await streamGET(request, {
      params: Promise.resolve({ showId, seasonNumber: "6", syncSessionId }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(fetchSeasonBackendResponseMock).toHaveBeenCalledWith(
      showId,
      "6",
      `/sync-sessions/${syncSessionId}/stream`,
      expect.objectContaining({
        seasonIdHint: seasonId,
        queryString: "view=live",
        retries: 0,
        timeoutMs: 90_000,
      }),
    );
    await expect(response.text()).resolves.toContain("event: sync_session");
  });

  it("forwards sync-session retry requests", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/sync-sessions/${syncSessionId}/retry?season_id=${seasonId}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ retry_kind: "retry_failed_media" }),
      },
    );

    const response = await retryPOST(request, {
      params: Promise.resolve({ showId, seasonNumber: "6", syncSessionId }),
    });

    expect(response.status).toBe(200);
    expect(fetchSeasonBackendJsonMock).toHaveBeenCalledWith(
      showId,
      "6",
      `/sync-sessions/${syncSessionId}/retry`,
      expect.objectContaining({
        method: "POST",
        seasonIdHint: seasonId,
        retries: 1,
        timeoutMs: 45_000,
      }),
    );
    expect(String(fetchSeasonBackendJsonMock.mock.calls[0]?.[3]?.body ?? "")).toContain("retry_failed_media");
  });
});
