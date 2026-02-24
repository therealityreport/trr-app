import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, fetchSeasonBackendJsonMock, socialProxyErrorResponseMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  fetchSeasonBackendJsonMock: vi.fn(),
  socialProxyErrorResponseMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/social-admin-proxy", () => ({
  fetchSeasonBackendJson: fetchSeasonBackendJsonMock,
  socialProxyErrorResponse: socialProxyErrorResponseMock,
}));

import { GET as getJobs } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/jobs/route";
import { GET as getRuns } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/route";
import { GET as getTargets } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/targets/route";
import { GET as getAnalytics } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/route";
import { GET as getWeek } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/route";
import {
  GET as getPostComments,
  POST as refreshPostComments,
} from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/posts/[platform]/[sourceId]/route";

describe("social routes season_id hint forwarding", () => {
  const showId = "11111111-1111-4111-8111-111111111111";
  const seasonId = "22222222-2222-4222-8222-222222222222";

  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchSeasonBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockReset();

    requireAdminMock.mockResolvedValue(undefined);
    fetchSeasonBackendJsonMock.mockResolvedValue({ ok: true });
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  it("forwards season_id hint on jobs route and uses reduced retries/timeout", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/jobs?season_id=${seasonId}&run_id=run-1&limit=250`,
      { method: "GET" },
    );

    const response = await getJobs(request, { params: Promise.resolve({ showId, seasonNumber: "6" }) });
    expect(response.status).toBe(200);
    expect(fetchSeasonBackendJsonMock).toHaveBeenCalledWith(
      showId,
      "6",
      "/ingest/jobs",
      expect.objectContaining({
        seasonIdHint: seasonId,
        retries: 0,
        timeoutMs: 15_000,
      }),
    );
    const options = fetchSeasonBackendJsonMock.mock.calls[0]?.[3] as { queryString?: string };
    expect(String(options.queryString ?? "")).not.toContain("season_id=");
  });

  it("returns 400 for invalid season_id on jobs route", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/jobs?season_id=bad-id`,
      { method: "GET" },
    );

    const response = await getJobs(request, { params: Promise.resolve({ showId, seasonNumber: "6" }) });
    const payload = (await response.json()) as { error?: string; code?: string };

    expect(response.status).toBe(400);
    expect(payload.code).toBe("BAD_REQUEST");
    expect(payload.error).toContain("season_id");
    expect(fetchSeasonBackendJsonMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid season_id on runs route", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/runs?season_id=bad-id`,
      { method: "GET" },
    );

    const response = await getRuns(request, { params: Promise.resolve({ showId, seasonNumber: "6" }) });
    const payload = (await response.json()) as { error?: string; code?: string };

    expect(response.status).toBe(400);
    expect(payload.code).toBe("BAD_REQUEST");
    expect(payload.error).toContain("season_id");
    expect(fetchSeasonBackendJsonMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid season_id on targets route", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/targets?season_id=bad-id`,
      { method: "GET" },
    );

    const response = await getTargets(request, { params: Promise.resolve({ showId, seasonNumber: "6" }) });
    const payload = (await response.json()) as { error?: string; code?: string };

    expect(response.status).toBe(400);
    expect(payload.code).toBe("BAD_REQUEST");
    expect(payload.error).toContain("season_id");
    expect(fetchSeasonBackendJsonMock).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid season_id on analytics route", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/analytics?season_id=bad-id`,
      { method: "GET" },
    );

    const response = await getAnalytics(request, { params: Promise.resolve({ showId, seasonNumber: "6" }) });
    const payload = (await response.json()) as { error?: string; code?: string };

    expect(response.status).toBe(400);
    expect(payload.code).toBe("BAD_REQUEST");
    expect(payload.error).toContain("season_id");
    expect(fetchSeasonBackendJsonMock).not.toHaveBeenCalled();
  });

  it("forwards season_id hint on week analytics route", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/analytics/week/3?season_id=${seasonId}&source_scope=bravo`,
      { method: "GET" },
    );

    const response = await getWeek(request, {
      params: Promise.resolve({ showId, seasonNumber: "6", weekIndex: "3" }),
    });
    expect(response.status).toBe(200);
    expect(fetchSeasonBackendJsonMock).toHaveBeenCalledWith(
      showId,
      "6",
      "/analytics/week/3",
      expect.objectContaining({
        seasonIdHint: seasonId,
        retries: 0,
      }),
    );
    const options = fetchSeasonBackendJsonMock.mock.calls[0]?.[3] as { queryString?: string };
    expect(String(options.queryString ?? "")).not.toContain("season_id=");
  });

  it("forwards season_id hint on post comments routes", async () => {
    const getRequest = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/analytics/posts/youtube/abc123?season_id=${seasonId}`,
      { method: "GET" },
    );

    const getResponse = await getPostComments(getRequest, {
      params: Promise.resolve({ showId, seasonNumber: "6", platform: "youtube", sourceId: "abc123" }),
    });
    expect(getResponse.status).toBe(200);
    expect(fetchSeasonBackendJsonMock).toHaveBeenCalledWith(
      showId,
      "6",
      "/analytics/posts/youtube/abc123",
      expect.objectContaining({
        seasonIdHint: seasonId,
        retries: 0,
      }),
    );

    fetchSeasonBackendJsonMock.mockClear();

    const postRequest = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/analytics/posts/youtube/abc123?season_id=${seasonId}`,
      {
        method: "POST",
        body: JSON.stringify({ sync_strategy: "incremental" }),
      },
    );

    const postResponse = await refreshPostComments(postRequest, {
      params: Promise.resolve({ showId, seasonNumber: "6", platform: "youtube", sourceId: "abc123" }),
    });
    expect(postResponse.status).toBe(200);
    expect(fetchSeasonBackendJsonMock).toHaveBeenCalledWith(
      showId,
      "6",
      "/analytics/posts/youtube/abc123/refresh",
      expect.objectContaining({
        seasonIdHint: seasonId,
        retries: 0,
      }),
    );
  });

  it("returns 400 for invalid season_id on post routes", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/analytics/posts/youtube/abc123?season_id=bad-id`,
      { method: "GET" },
    );

    const response = await getPostComments(request, {
      params: Promise.resolve({ showId, seasonNumber: "6", platform: "youtube", sourceId: "abc123" }),
    });
    const payload = (await response.json()) as { error?: string; code?: string };

    expect(response.status).toBe(400);
    expect(payload.code).toBe("BAD_REQUEST");
    expect(payload.error).toContain("season_id");
    expect(fetchSeasonBackendJsonMock).not.toHaveBeenCalled();
  });
});
