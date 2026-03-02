import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import fs from "node:fs";
import path from "node:path";

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
import { GET as getRunsSummary } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/runs/summary/route";
import { GET as getTargets } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/targets/route";
import { GET as getAnalytics } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/route";
import { GET as getWeek } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/route";
import { GET as getWeekSummary } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/week/[weekIndex]/summary/route";
import {
  GET as getPostComments,
  POST as refreshPostComments,
} from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/analytics/posts/[platform]/[sourceId]/route";
import { GET as getTikTokSoundPosts } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/sounds/[soundId]/posts/route";
import { GET as getTikTokSounds } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/sounds/route";
import { GET as getTikTokContentHealth } from "@/app/api/admin/trr-api/shows/[showId]/seasons/[seasonNumber]/social/tiktok/content-health/route";
import { buildSeasonSocialWeekUrl } from "@/lib/admin/show-admin-routes";

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

  it("forwards season_id hint on jobs route and uses poll-safe retries/timeout", async () => {
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

  it("forwards season_id hint on targets route with bounded timeout", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/targets?season_id=${seasonId}&source_scope=bravo`,
      { method: "GET" },
    );

    const response = await getTargets(request, { params: Promise.resolve({ showId, seasonNumber: "6" }) });
    expect(response.status).toBe(200);
    expect(fetchSeasonBackendJsonMock).toHaveBeenCalledWith(
      showId,
      "6",
      "/targets",
      expect.objectContaining({
        seasonIdHint: seasonId,
        retries: 0,
        timeoutMs: 12_000,
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

  it("sets no-store headers on runs polling responses", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/runs?season_id=${seasonId}`,
      { method: "GET" },
    );

    const response = await getRuns(request, { params: Promise.resolve({ showId, seasonNumber: "6" }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("returns 400 for invalid season_id on runs summary route", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/runs/summary?season_id=bad-id`,
      { method: "GET" },
    );

    const response = await getRunsSummary(request, { params: Promise.resolve({ showId, seasonNumber: "6" }) });
    const payload = (await response.json()) as { error?: string; code?: string };

    expect(response.status).toBe(400);
    expect(payload.code).toBe("BAD_REQUEST");
    expect(payload.error).toContain("season_id");
    expect(fetchSeasonBackendJsonMock).not.toHaveBeenCalled();
  });

  it("sets no-store headers on runs summary polling responses", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/runs/summary?season_id=${seasonId}`,
      { method: "GET" },
    );

    const response = await getRunsSummary(request, { params: Promise.resolve({ showId, seasonNumber: "6" }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
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

  it("supports background timeout profile on analytics route", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/analytics?season_id=${seasonId}&timeout_profile=background&source_scope=bravo`,
      { method: "GET" },
    );

    const response = await getAnalytics(request, { params: Promise.resolve({ showId, seasonNumber: "6" }) });
    expect(response.status).toBe(200);
    expect(fetchSeasonBackendJsonMock).toHaveBeenCalledWith(
      showId,
      "6",
      "/analytics",
      expect.objectContaining({
        seasonIdHint: seasonId,
        retries: 2,
        timeoutMs: 35_000,
      }),
    );
    const options = fetchSeasonBackendJsonMock.mock.calls[0]?.[3] as { queryString?: string };
    expect(String(options.queryString ?? "")).not.toContain("season_id=");
    expect(String(options.queryString ?? "")).not.toContain("timeout_profile=");
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
        timeoutMs: 40_000,
      }),
    );
    const options = fetchSeasonBackendJsonMock.mock.calls[0]?.[3] as { queryString?: string };
    expect(String(options.queryString ?? "")).not.toContain("season_id=");
  });

  it("sets default max_comments_per_post=0 on week analytics route", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/analytics/week/3?season_id=${seasonId}&source_scope=bravo`,
      { method: "GET" },
    );

    const response = await getWeek(request, { params: Promise.resolve({ showId, seasonNumber: "6", weekIndex: "3" }) });
    expect(response.status).toBe(200);

    const options = fetchSeasonBackendJsonMock.mock.calls[0]?.[3] as { queryString?: string };
    expect(String(options.queryString ?? "")).toContain("max_comments_per_post=0");
    expect(String(options.queryString ?? "")).not.toContain("post_offset=20");
  });

  it("forwards week summary route to summary endpoint with speed-first defaults", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/analytics/week/3/summary?season_id=${seasonId}&source_scope=bravo`,
      { method: "GET" },
    );

    const response = await getWeekSummary(request, {
      params: Promise.resolve({ showId, seasonNumber: "6", weekIndex: "3" }),
    });
    expect(response.status).toBe(200);
    expect(fetchSeasonBackendJsonMock).toHaveBeenCalledWith(
      showId,
      "6",
      "/analytics/week/3/summary",
      expect.objectContaining({
        seasonIdHint: seasonId,
        retries: 0,
        timeoutMs: 25_000,
      }),
    );
    const options = fetchSeasonBackendJsonMock.mock.calls[0]?.[3] as { queryString?: string };
    expect(String(options.queryString ?? "")).toContain("max_comments_per_post=0");
  });

  it("forwards week analytics pagination params to backend", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/analytics/week/3?season_id=${seasonId}&source_scope=bravo&post_limit=20&post_offset=40&max_comments_per_post=30&sort_field=likes&sort_dir=asc`,
      { method: "GET" },
    );

    const response = await getWeek(request, { params: Promise.resolve({ showId, seasonNumber: "6", weekIndex: "3" }) });
    expect(response.status).toBe(200);

    const options = fetchSeasonBackendJsonMock.mock.calls[0]?.[3] as { queryString?: string };
    const query = new URLSearchParams(String(options.queryString ?? ""));
    expect(query.get("post_limit")).toBe("20");
    expect(query.get("post_offset")).toBe("40");
    expect(query.get("max_comments_per_post")).toBe("30");
    expect(query.get("sort_field")).toBe("likes");
    expect(query.get("sort_dir")).toBe("asc");
  });

  it("forwards explicit week analytics platforms filter to backend", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/analytics/week/3?season_id=${seasonId}&source_scope=bravo&platforms=facebook`,
      { method: "GET" },
    );

    const response = await getWeek(request, { params: Promise.resolve({ showId, seasonNumber: "6", weekIndex: "3" }) });
    expect(response.status).toBe(200);

    const options = fetchSeasonBackendJsonMock.mock.calls[0]?.[3] as { queryString?: string };
    const query = new URLSearchParams(String(options.queryString ?? ""));
    expect(query.get("platforms")).toBe("facebook");
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

  it("forwards season_id hint on TikTok sound posts route", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/tiktok/sounds/7540327234013301517/posts?season_id=${seasonId}&limit=10`,
      { method: "GET" },
    );

    const response = await getTikTokSoundPosts(request, {
      params: Promise.resolve({ showId, seasonNumber: "6", soundId: "7540327234013301517" }),
    });
    expect(response.status).toBe(200);
    expect(fetchSeasonBackendJsonMock).toHaveBeenCalledWith(
      showId,
      "6",
      "/tiktok/sounds/7540327234013301517/posts",
      expect.objectContaining({
        seasonIdHint: seasonId,
      }),
    );
  });

  it("forwards season_id hint on TikTok sounds route", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/tiktok/sounds?season_id=${seasonId}&search=lisa&limit=10`,
      { method: "GET" },
    );

    const response = await getTikTokSounds(request, {
      params: Promise.resolve({ showId, seasonNumber: "6" }),
    });
    expect(response.status).toBe(200);
    expect(fetchSeasonBackendJsonMock).toHaveBeenCalledWith(
      showId,
      "6",
      "/tiktok/sounds",
      expect.objectContaining({
        seasonIdHint: seasonId,
      }),
    );
  });

  it("forwards season_id hint on TikTok content health route", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/trr-api/shows/${showId}/seasons/6/social/tiktok/content-health?season_id=${seasonId}&hashtag=rhoslc`,
      { method: "GET" },
    );

    const response = await getTikTokContentHealth(request, {
      params: Promise.resolve({ showId, seasonNumber: "6" }),
    });
    expect(response.status).toBe(200);
    expect(fetchSeasonBackendJsonMock).toHaveBeenCalledWith(
      showId,
      "6",
      "/tiktok/content-health",
      expect.objectContaining({
        seasonIdHint: seasonId,
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

  it("keeps canonical social week routes stable for platform and details paths", () => {
    expect(
      buildSeasonSocialWeekUrl({
        showSlug: "rhoslc",
        seasonNumber: 6,
        weekIndex: 0,
        platform: "facebook",
      }),
    ).toBe("/rhoslc/s6/social/w0/facebook");

    expect(
      buildSeasonSocialWeekUrl({
        showSlug: "rhoslc",
        seasonNumber: 6,
        weekIndex: 0,
      }),
    ).toBe("/rhoslc/s6/social/w0/details");
  });

  it("drops legacy social week query aliases from canonical urls", () => {
    const result = buildSeasonSocialWeekUrl({
      showSlug: "rhoslc",
      seasonNumber: 6,
      weekIndex: 0,
      platform: "facebook",
      query: new URLSearchParams("social_platform=twitter&season_id=deadbeef&source_scope=bravo&day=2025-09-16"),
    });

    expect(result).toBe("/rhoslc/s6/social/w0/facebook?day=2025-09-16");
    expect(result).not.toContain("social_platform=");
    expect(result).not.toContain("season_id=");
  });

  it("dedupes season page canonical replace attempts", () => {
    const filePath = path.resolve(
      __dirname,
      "../src/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page.tsx",
    );
    const contents = fs.readFileSync(filePath, "utf8");

    expect(contents).toMatch(/const seasonCanonicalReplaceRef = useRef<string \| null>\(null\)/);
    expect(contents).toMatch(/if \(seasonCanonicalReplaceRef\.current === canonicalRouteUrl\) return;/);
    expect(contents).toMatch(/seasonCanonicalReplaceRef\.current = canonicalRouteUrl;/);
  });
});
