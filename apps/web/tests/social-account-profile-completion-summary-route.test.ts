import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminMock, queryMock, socialProxyErrorResponseMock } = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  queryMock: vi.fn(),
  socialProxyErrorResponseMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/postgres", () => ({
  query: queryMock,
}));

vi.mock("@/lib/server/trr-api/social-admin-proxy", () => ({
  socialProxyErrorResponse: socialProxyErrorResponseMock,
}));

import { GET } from "@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/completion-summary/route";

describe("social account profile completion summary route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    queryMock.mockReset();
    socialProxyErrorResponseMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: "admin-1", provider: "firebase" });
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      Response.json({ error: String(error), code: "BACKEND_UNREACHABLE" }, { status: 502 }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defaults to the current year and counts collab comment gaps from health-aware matches", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-29T12:00:00Z"));

    queryMock.mockResolvedValue({
      rows: [
        {
          total_posts: "3",
          total_reported_comments: "1200",
          saved_comments: "780",
          missing_comments: "420",
          accounted_comments: "1200",
          comments_finished: "1",
          comments_in_progress: "2",
          comments_not_started: "0",
          details_finished: "2",
          details_not_started: "1",
          media_finished: "1",
          media_in_progress: "1",
          media_not_started: "1",
        },
      ],
    });

    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/completion-summary"),
      { params: Promise.resolve({ platform: "instagram", handle: "bravotv" }) },
    );
    const body = (await response.json()) as {
      year: number;
      total_posts: number;
      total_reported_comments: number;
      saved_comments: number;
      missing_comments: number;
      lanes: {
        comments: { finished: number; in_progress: number; not_started: number };
      };
    };

    expect(response.status).toBe(200);
    expect(body.year).toBe(2026);
    expect(body.total_posts).toBe(3);
    expect(body.total_reported_comments).toBe(1200);
    expect(body.saved_comments).toBe(780);
    expect(body.missing_comments).toBe(420);
    expect(body.lanes.comments).toEqual({
      finished: 1,
      in_progress: 2,
      not_started: 0,
    });

    expect(queryMock).toHaveBeenCalledWith(expect.any(String), ["bravotv", 2026]);
    const sql = String(queryMock.mock.calls[0]?.[0] ?? "");
    expect(sql).toContain("social.comment_capture_health");
    expect(sql).toContain("cp.owner_username");
    expect(sql).toContain("p.owner_username");
    expect(sql).toContain("p.username");
    expect(sql).toContain("cp.collaborators");
    expect(sql).toContain("p.collaborators");
    expect(sql).toContain("source_account");
    expect(sql).toContain("p.raw_data");
    expect(sql).not.toMatch(/\bp\.comments_count\b/);
  });

  it("falls back to the current year when the year query param is invalid", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-01T12:00:00Z"));
    queryMock.mockResolvedValue({ rows: [] });

    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/completion-summary?year=nope"),
      { params: Promise.resolve({ platform: "instagram", handle: "@bravotv" }) },
    );
    const body = (await response.json()) as { year: number; handle: string; total_posts: number };

    expect(response.status).toBe(200);
    expect(body.year).toBe(2026);
    expect(body.handle).toBe("bravotv");
    expect(body.total_posts).toBe(0);
    expect(queryMock).toHaveBeenCalledWith(expect.any(String), ["bravotv", 2026]);
  });

  it("rejects unsupported platforms before querying completion data", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/social/profiles/tiktok/bravotv/completion-summary"),
      { params: Promise.resolve({ platform: "tiktok", handle: "bravotv" }) },
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("unsupported_profile");
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("returns the shared proxy error response when the completion query fails", async () => {
    const error = new Error("column p.comments_count does not exist");
    queryMock.mockRejectedValue(error);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/completion-summary?year=2026"),
      { params: Promise.resolve({ platform: "instagram", handle: "bravotv" }) },
    );
    const body = (await response.json()) as { error: string; code: string };

    expect(response.status).toBe(502);
    expect(body.code).toBe("BACKEND_UNREACHABLE");
    expect(body.error).toContain("column p.comments_count does not exist");
    expect(socialProxyErrorResponseMock).toHaveBeenCalledWith(
      error,
      "[api] Failed to load social completion summary",
    );
  });
});
