import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchAdminBackendJsonMock } = vi.hoisted(() => ({
  fetchAdminBackendJsonMock: vi.fn(),
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => {
  class AdminReadProxyError extends Error {
    status: number;
    code?: string;
    retryable?: boolean;

    constructor(message: string, status: number, options?: { code?: string; retryable?: boolean }) {
      super(message);
      this.status = status;
      this.code = options?.code;
      this.retryable = options?.retryable;
    }
  }
  return {
    AdminReadProxyError,
    fetchAdminBackendJson: fetchAdminBackendJsonMock,
    buildAdminBackendStatusError: vi.fn((options: { status: number; fallbackMessage: string }) =>
      new AdminReadProxyError(options.fallbackMessage, options.status),
    ),
  };
});

import {
  loadSharedAccountSourcesFromBackend,
  updateSharedAccountSourcesInBackend,
} from "@/lib/server/admin/shared-account-sources";

const ADMIN_CONTEXT = { uid: "admin-1", email: "admin@example.com" };

describe("shared account source backend adapter", () => {
  beforeEach(() => {
    fetchAdminBackendJsonMock.mockReset();
  });

  it("loads sources from the authenticated v2 contract", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      durationMs: 5,
      data: {
        source_scope: "network",
        using_defaults: false,
        sources: [
          {
            id: "source-1",
            platform: "instagram",
            source_scope: "network",
            account_handle: "@BravoTV",
            is_active: true,
            scrape_priority: 10,
            metadata: {},
            last_scrape_status: null,
            last_scrape_at: null,
            last_classified_at: null,
          },
        ],
      },
    });

    const payload = await loadSharedAccountSourcesFromBackend(ADMIN_CONTEXT, {
      sourceScope: "network",
      includeInactive: false,
      platforms: ["instagram"],
    });

    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/socials/shared-account-sources",
      expect.objectContaining({
        apiVersion: "v2",
        adminContext: ADMIN_CONTEXT,
        queryString: "source_scope=network&include_inactive=false&platforms=instagram",
      }),
    );
    expect(payload.sources[0]?.account_handle).toBe("bravotv");
  });

  it("updates sources through the same v2 contract", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      durationMs: 5,
      data: { source_scope: "network", sources: [], using_defaults: false },
    });
    const body = JSON.stringify({ source_scope: "network", sources: [] });

    await updateSharedAccountSourcesInBackend(ADMIN_CONTEXT, body);

    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/socials/shared-account-sources",
      expect.objectContaining({
        apiVersion: "v2",
        adminContext: ADMIN_CONTEXT,
        method: "PUT",
        body,
      }),
    );
  });

  it("rejects malformed backend payloads", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      durationMs: 5,
      data: { source_scope: "network", sources: "not-an-array" },
    });

    await expect(
      loadSharedAccountSourcesFromBackend(ADMIN_CONTEXT, { sourceScope: "network" }),
    ).rejects.toMatchObject({ code: "INVALID_BACKEND_RESPONSE", status: 502 });
  });
});
