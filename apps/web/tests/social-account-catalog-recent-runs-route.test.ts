import { beforeEach, describe, expect, it, vi } from "vitest";
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

import { GET } from "@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/runs/recent/route";

describe("social account catalog recent runs route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    queryMock.mockReset();
    socialProxyErrorResponseMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: "admin-1", provider: "firebase" });
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      Response.json({ error: String(error), code: "BACKEND_UNREACHABLE" }, { status: 502 }),
    );
  });

  it("returns recent catalog runs without loading the profile summary", async () => {
    queryMock.mockResolvedValue({
      rows: [
        {
          job_id: "job-running",
          run_id: "run-running",
          status: "running",
          created_at: new Date("2026-07-01T14:00:00Z"),
          started_at: new Date("2026-07-01T14:01:00Z"),
          completed_at: null,
          error_message: null,
          run_config: {
            catalog_action: "backfill",
            catalog_action_scope: "full_history",
            selected_tasks: ["post_details", "comments", "media"],
            attached_followups: {
              comments: {
                run_id: "comments-run-1",
                status: "pending",
                state: "pending",
                source: "deferred_after_catalog",
              },
            },
          },
        },
      ],
    });

    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/social/profiles/instagram/@bravotv/catalog/runs/recent?limit=99"),
      { params: Promise.resolve({ platform: "instagram", handle: "@bravotv" }) },
    );
    const body = (await response.json()) as {
      handle?: string;
      catalog_recent_runs?: Array<{ run_id?: string; selected_tasks?: string[] }>;
    };

    expect(response.status).toBe(200);
    expect(body.handle).toBe("bravotv");
    expect(body.catalog_recent_runs).toEqual([
      expect.objectContaining({
        run_id: "run-running",
        selected_tasks: ["post_details", "comments", "media"],
      }),
    ]);
    expect(queryMock).toHaveBeenCalledWith(expect.not.stringContaining("/summary"), [
      "shared_account_catalog_backfill",
      "instagram",
      "bravotv",
      expect.arrayContaining(["shared_account_posts", "analytics_refresh"]),
      25,
    ]);
  });

  it("rejects malformed explicit limits before querying recent runs", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/social/profiles/instagram/@bravotv/catalog/runs/recent?limit=abc"),
      { params: Promise.resolve({ platform: "instagram", handle: "@bravotv" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("limit must be an integer");
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("mutes pending attached lanes when the parent run is cancelled", async () => {
    queryMock.mockResolvedValue({
      rows: [
        {
          job_id: null,
          run_id: "run-cancelled",
          status: "cancelled",
          created_at: "2026-06-30T14:00:00.000Z",
          started_at: null,
          completed_at: "2026-06-30T14:30:00.000Z",
          error_message: null,
          run_config: {
            attached_followups: {
              comments: {
                status: "pending",
                state: "pending",
                source: "deferred_after_catalog",
              },
              media: {
                status: "queued",
                state: "pending",
                source: "catalog_media_mirror",
                enqueued_job_count: 0,
              },
            },
          },
        },
      ],
    });

    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/catalog/runs/recent"),
      { params: Promise.resolve({ platform: "instagram", handle: "bravotv" }) },
    );
    const body = (await response.json()) as {
      catalog_recent_runs?: Array<{
        attached_followups?: {
          comments?: { status?: string; state?: string };
          media?: { status?: string; state?: string };
        };
      }>;
    };
    const run = body.catalog_recent_runs?.[0];

    expect(response.status).toBe(200);
    expect(run?.attached_followups?.comments).toEqual(
      expect.objectContaining({ status: "cancelled", state: "cancelled" }),
    );
    expect(run?.attached_followups?.media).toEqual(
      expect.objectContaining({ status: "cancelled", state: "cancelled" }),
    );
  });

  it("rejects unsupported profiles before querying runs", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/social/profiles/tiktok/bravotv/catalog/runs/recent"),
      { params: Promise.resolve({ platform: "tiktok", handle: "bravotv" }) },
    );
    const body = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(body.error).toBe("unsupported_profile");
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("returns the shared proxy error response when recent runs cannot load", async () => {
    const error = new Error("database timed out");
    queryMock.mockRejectedValue(error);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/catalog/runs/recent"),
      { params: Promise.resolve({ platform: "instagram", handle: "bravotv" }) },
    );
    const body = (await response.json()) as { code?: string; error?: string };

    expect(response.status).toBe(502);
    expect(body.code).toBe("BACKEND_UNREACHABLE");
    expect(body.error).toContain("database timed out");
    expect(socialProxyErrorResponseMock).toHaveBeenCalledWith(
      error,
      "[api] Failed to load social account catalog recent runs",
    );
  });
});
