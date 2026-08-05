import { beforeEach, describe, expect, it, vi } from "vitest";

const { fetchAdminBackendJsonMock, buildAdminBackendStatusErrorMock } = vi.hoisted(() => ({
  fetchAdminBackendJsonMock: vi.fn(),
  buildAdminBackendStatusErrorMock: vi.fn(),
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  AdminReadProxyError: class AdminReadProxyError extends Error {},
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
  buildAdminBackendStatusError: buildAdminBackendStatusErrorMock,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS: 5_000,
}));

import { getTypographyState } from "@/lib/server/admin/typography-repository";

const persistedState = {
  sets: [
    {
      id: "set-1",
      slug: "headline",
      name: "Headline",
      area: "admin",
      seed_source: "seed",
      roles: {
        body: {
          mobile: {
            fontFamily: "var(--font-hamburg)",
            fontSize: "16px",
            fontWeight: "400",
            lineHeight: "24px",
            letterSpacing: "0px",
          },
          desktop: {
            fontFamily: "var(--font-hamburg)",
            fontSize: "18px",
            fontWeight: "400",
            lineHeight: "28px",
            letterSpacing: "0px",
          },
        },
      },
      created_at: "2026-03-25T00:00:00Z",
      updated_at: "2026-03-25T00:00:00Z",
    },
  ],
  assignments: [
    {
      id: "assignment-1",
      area: "admin",
      page_key: "page",
      instance_key: null,
      set_id: "set-1",
      source_path: "src/app/page.tsx",
      notes: null,
      created_at: "2026-03-25T00:00:00Z",
      updated_at: "2026-03-25T00:00:00Z",
    },
  ],
};

describe("typography repository read path", () => {
  beforeEach(() => {
    fetchAdminBackendJsonMock.mockReset();
    buildAdminBackendStatusErrorMock.mockReset();
  });

  it("reads persisted state from the v2 backend without app-side SQL", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({ status: 200, data: persistedState });
    const adminContext = { uid: "admin-user", email: null, verifiedAt: 1 };

    const state = await getTypographyState({ adminContext });

    expect(state.sets).toHaveLength(1);
    expect(state.assignments).toHaveLength(1);
    expect(state.sets[0]?.seedSource).toBe("seed");
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith("/admin/site-typography", {
      apiVersion: "v2",
      adminContext,
      timeoutMs: 5_000,
      routeName: "site-typography:state",
    });
  });

  it("preserves backend failures for the route layer", async () => {
    const error = new Error("backend status");
    buildAdminBackendStatusErrorMock.mockReturnValue(error);
    fetchAdminBackendJsonMock.mockResolvedValue({ status: 503, data: { error: "unavailable" } });

    await expect(getTypographyState()).rejects.toBe(error);
    expect(buildAdminBackendStatusErrorMock).toHaveBeenCalledWith({
      status: 503,
      data: { error: "unavailable" },
      fallbackMessage: "Failed to fetch typography state",
      routeName: "site-typography:state",
    });
  });
});
