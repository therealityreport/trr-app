import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const {
  requireAdminMock,
  toVerifiedAdminContextMock,
  loadSharedAccountSourcesFromBackendMock,
  updateSharedAccountSourcesInBackendMock,
  buildAdminProxyErrorResponseMock,
} = vi.hoisted(() => ({
  requireAdminMock: vi.fn(),
  toVerifiedAdminContextMock: vi.fn(),
  loadSharedAccountSourcesFromBackendMock: vi.fn(),
  updateSharedAccountSourcesInBackendMock: vi.fn(),
  buildAdminProxyErrorResponseMock: vi.fn(),
}));

vi.mock("@/lib/server/auth", () => ({
  requireAdmin: requireAdminMock,
  toVerifiedAdminContext: toVerifiedAdminContextMock,
}));

vi.mock("@/lib/server/admin/shared-account-sources", () => ({
  normalizeSharedAccountSourceScope: (value: string | null) => value || "network",
  parseSharedAccountSourcePlatforms: (value: string | null) =>
    value ? value.split(",") : null,
  loadSharedAccountSourcesFromBackend: loadSharedAccountSourcesFromBackendMock,
  updateSharedAccountSourcesInBackend: updateSharedAccountSourcesInBackendMock,
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  buildAdminProxyErrorResponse: buildAdminProxyErrorResponseMock,
}));

import { GET, PUT } from "@/app/api/admin/trr-api/social/shared/sources/route";

const ADMIN_CONTEXT = { uid: "admin-1", email: "admin@example.com" };

describe("shared social sources route", () => {
  beforeEach(() => {
    requireAdminMock.mockReset();
    toVerifiedAdminContextMock.mockReset();
    loadSharedAccountSourcesFromBackendMock.mockReset();
    updateSharedAccountSourcesInBackendMock.mockReset();
    buildAdminProxyErrorResponseMock.mockReset();

    requireAdminMock.mockResolvedValue({ uid: "firebase-admin-1" });
    toVerifiedAdminContextMock.mockReturnValue(ADMIN_CONTEXT);
    loadSharedAccountSourcesFromBackendMock.mockResolvedValue({
      source_scope: "network",
      sources: [],
      using_defaults: false,
    });
    updateSharedAccountSourcesInBackendMock.mockResolvedValue({
      source_scope: "network",
      sources: [],
      using_defaults: false,
    });
    buildAdminProxyErrorResponseMock.mockImplementation((error: unknown) =>
      NextResponse.json(
        { error: error instanceof Error ? error.message : "failed" },
        { status: 502 },
      ),
    );
  });

  it("forwards verified admin context and normalized GET filters", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/admin/trr-api/social/shared/sources" +
          "?source_scope=network&include_inactive=false&platforms=instagram,tiktok",
      ),
    );

    expect(response.status).toBe(200);
    expect(toVerifiedAdminContextMock).toHaveBeenCalledWith({ uid: "firebase-admin-1" });
    expect(loadSharedAccountSourcesFromBackendMock).toHaveBeenCalledWith(
      ADMIN_CONTEXT,
      {
        sourceScope: "network",
        includeInactive: false,
        platforms: ["instagram", "tiktok"],
      },
    );
  });

  it("forwards the exact PUT body with verified admin context", async () => {
    const body = JSON.stringify({
      source_scope: "network",
      sources: [{ platform: "instagram", account_handle: "bravotv" }],
    });
    const response = await PUT(
      new NextRequest("http://localhost/api/admin/trr-api/social/shared/sources", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body,
      }),
    );

    expect(response.status).toBe(200);
    expect(updateSharedAccountSourcesInBackendMock).toHaveBeenCalledWith(
      ADMIN_CONTEXT,
      body,
    );
  });

  it("returns the typed backend error and never uses a local SQL fallback", async () => {
    const error = new Error("backend unavailable");
    loadSharedAccountSourcesFromBackendMock.mockRejectedValue(error);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/trr-api/social/shared/sources"),
    );

    expect(response.status).toBe(502);
    expect(buildAdminProxyErrorResponseMock).toHaveBeenCalledWith(error);
  });
});
