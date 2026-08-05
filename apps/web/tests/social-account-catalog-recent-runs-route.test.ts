import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  toVerifiedAdminContextMock,
  fetchAdminBackendJsonMock,
  buildAdminBackendStatusErrorMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  toVerifiedAdminContextMock: vi.fn(),
  fetchAdminBackendJsonMock: vi.fn(),
  buildAdminBackendStatusErrorMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
  toVerifiedAdminContext: toVerifiedAdminContextMock,
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
  buildAdminBackendStatusError: buildAdminBackendStatusErrorMock,
  buildAdminProxyErrorResponse: (error: Error) =>
    Response.json({ error: error.message, code: "BACKEND_UNREACHABLE" }, { status: (error as Error & { status?: number }).status ?? 502 }),
}));

import { GET } from "@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/catalog/runs/recent/route";

describe("social account catalog recent runs route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    toVerifiedAdminContextMock.mockReset();
    fetchAdminBackendJsonMock.mockReset();
    buildAdminBackendStatusErrorMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: "admin-1", provider: "firebase" });
    toVerifiedAdminContextMock.mockReturnValue({ authorization: "verified-admin" });
  });

  it("forwards verified admin context to v2 and preserves the recent-runs envelope", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      durationMs: 12,
      data: {
        platform: "instagram",
        handle: "bravotv",
        catalog_recent_runs: [
          {
            job_id: "job-running",
            run_id: "run-running",
            status: "running",
            created_at: "2026-07-01T14:00:00.000Z",
            started_at: "2026-07-01T14:01:00.000Z",
            completed_at: null,
            error_message: null,
            catalog_action: "backfill",
            catalog_action_scope: "full_history",
            selected_tasks: ["post_details", "comments", "media"],
            effective_selected_tasks: ["post_details", "comments", "media"],
            attached_followups: {
              comments: {
                run_id: "comments-run-1",
                status: "pending",
                state: "pending",
                source: "deferred_after_catalog",
              },
            },
          },
        ],
      },
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
    expect(toVerifiedAdminContextMock).toHaveBeenCalledWith({ uid: "admin-1", provider: "firebase" });
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/social/profiles/instagram/bravotv/catalog/runs/recent",
      expect.objectContaining({
        apiVersion: "v2",
        adminContext: { authorization: "verified-admin" },
        queryString: "limit=25",
        routeName: "social-account-catalog-runs-recent",
      }),
    );
  });

  it("rejects malformed explicit limits before querying recent runs", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/social/profiles/instagram/@bravotv/catalog/runs/recent?limit=abc"),
      { params: Promise.resolve({ platform: "instagram", handle: "@bravotv" }) },
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe("limit must be an integer");
    expect(fetchAdminBackendJsonMock).not.toHaveBeenCalled();
  });

  it("preserves backend-normalized terminal attached followups", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      durationMs: 5,
      data: {
        platform: "instagram",
        handle: "bravotv",
        catalog_recent_runs: [
          {
            job_id: "",
            run_id: "run-cancelled",
            status: "cancelled",
            created_at: "2026-06-30T14:00:00.000Z",
            started_at: null,
            completed_at: "2026-06-30T14:30:00.000Z",
            error_message: null,
            attached_followups: {
              comments: {
                status: "cancelled",
                state: "cancelled",
                source: "deferred_after_catalog",
              },
              media: {
                status: "cancelled",
                state: "cancelled",
                source: "catalog_media_mirror",
                enqueued_job_count: 0,
              },
            },
          },
        ],
      },
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
    expect(fetchAdminBackendJsonMock).not.toHaveBeenCalled();
  });

  it("returns the v2 proxy error envelope when recent runs cannot load", async () => {
    const error = Object.assign(new Error("database timed out"), { status: 503 });
    fetchAdminBackendJsonMock.mockResolvedValue({ status: 503, durationMs: 2, data: { detail: { code: "DATABASE_SERVICE_UNAVAILABLE" } } });
    buildAdminBackendStatusErrorMock.mockReturnValue(error);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/catalog/runs/recent"),
      { params: Promise.resolve({ platform: "instagram", handle: "bravotv" }) },
    );
    const body = (await response.json()) as { code?: string; error?: string };

    expect(response.status).toBe(503);
    expect(body.code).toBe("BACKEND_UNREACHABLE");
    expect(body.error).toContain("database timed out");
    expect(buildAdminBackendStatusErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 503,
        routeName: "social-account-catalog-runs-recent",
      }),
    );
  });
});
