import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminMock,
  fetchSocialBackendJsonMock,
  socialProxyErrorResponseMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  fetchSocialBackendJsonMock: vi.fn(),
  socialProxyErrorResponseMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
}));

vi.mock("@/lib/server/trr-api/social-admin-proxy", () => ({
  fetchSocialBackendJson: fetchSocialBackendJsonMock,
  socialProxyErrorResponse: socialProxyErrorResponseMock,
}));

import {
  GET,
  POST,
} from "@/app/api/admin/trr-api/social/profiles/[platform]/[handle]/comments/audit-cursor-retries/route";

describe("social account comments audit cursor retry proxy route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    fetchSocialBackendJsonMock.mockReset();
    socialProxyErrorResponseMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: "admin-1", email: "admin@example.com" });
    fetchSocialBackendJsonMock.mockResolvedValue({ ok: true, selected_target_source_ids_count: 18 });
    socialProxyErrorResponseMock.mockImplementation((error: unknown) =>
      new Response(JSON.stringify({ error: String(error), code: "BACKEND_UNREACHABLE" }), {
        status: 502,
        headers: { "content-type": "application/json" },
      }),
    );
  });

  it("forwards recovery rows reads to TRR-Backend", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/comments/audit-cursor-retries?limit=18&show_filter=SummerHouse",
      ),
      {
        params: Promise.resolve({ platform: "instagram", handle: "bravotv" }),
      },
    );

    expect(response.status).toBe(200);
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/profiles/instagram/bravotv/comments/audit-cursor-retries",
      expect.objectContaining({
        method: "GET",
        queryString: "limit=18&show_filter=SummerHouse",
      }),
    );
  });

  it("forwards batch retry actions with admin context", async () => {
    const body = {
      limit: 18,
      batch_size: 1,
      max_comments_per_post: 0,
      attach_to_active_run: true,
      force_rerun_existing: true,
      show_filter: "SummerHouse",
    };
    const response = await POST(
      new NextRequest(
        "http://localhost/api/admin/trr-api/social/profiles/instagram/bravotv/comments/audit-cursor-retries",
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      ),
      {
        params: Promise.resolve({ platform: "instagram", handle: "bravotv" }),
      },
    );

    expect(response.status).toBe(200);
    expect(fetchSocialBackendJsonMock).toHaveBeenCalledWith(
      "/profiles/instagram/bravotv/comments/audit-cursor-retries",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(body),
        adminContext: {
          uid: "admin-1",
          email: "admin@example.com",
          verifiedAt: expect.any(Number),
        },
      }),
    );
  });
});
