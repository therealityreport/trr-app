import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  fetchAdminBackendJsonMock,
  buildAdminBackendStatusErrorMock,
  MockAdminReadProxyError,
} = vi.hoisted(() => ({
  fetchAdminBackendJsonMock: vi.fn(),
  buildAdminBackendStatusErrorMock: vi.fn(),
  MockAdminReadProxyError: class AdminReadProxyError extends Error {
    status: number;
    code?: string;
    retryable?: boolean;

    constructor(
      message: string,
      status: number,
      options?: { code?: string; retryable?: boolean },
    ) {
      super(message);
      this.status = status;
      this.code = options?.code;
      this.retryable = options?.retryable;
    }
  },
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  AdminReadProxyError: MockAdminReadProxyError,
  ADMIN_READ_PROXY_PRIMARY_TIMEOUT_MS: 12_000,
  buildAdminBackendStatusError: buildAdminBackendStatusErrorMock,
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
}));

import { getAdminShowByExactSlug } from "@/lib/server/trr-api/admin-show-slug-reads";

const SHOW_ID = "11111111-1111-1111-1111-111111111111";
const ADMIN_CONTEXT = {
  uid: "signed-admin",
  email: "admin@example.com",
  verifiedAt: 1_721_100_000_000,
};

const exactShow = (slug = "rhobh") => ({
  id: SHOW_ID,
  name: "The Real Housewives of Beverly Hills",
  slug,
});

const legacyResolved = (slug = "rhobh") => ({
  resolved: {
    show_id: SHOW_ID,
    slug,
    canonical_slug: slug,
    show_name: "The Real Housewives of Beverly Hills",
  },
});

describe("admin exact show-slug v2 read", () => {
  beforeEach(() => {
    fetchAdminBackendJsonMock.mockReset();
    buildAdminBackendStatusErrorMock.mockReset();
    buildAdminBackendStatusErrorMock.mockImplementation(
      ({ fallbackMessage, status }: { fallbackMessage: string; status: number }) =>
        new MockAdminReadProxyError(fallbackMessage, status),
    );
  });

  it("normalizes the slug and uses the signed strict v2 contract", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { show: exactShow() },
    });

    await expect(getAdminShowByExactSlug(" RHOBH!!! ", { adminContext: ADMIN_CONTEXT })).resolves.toEqual(
      exactShow(),
    );
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledOnce();
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/shows/exact-slug/rhobh",
      expect.objectContaining({
        apiVersion: "v2",
        adminContext: ADMIN_CONTEXT,
        routeName: "exact-show-slug",
      }),
    );
  });

  it("returns null for the v2 resource-level SHOW_NOT_FOUND problem", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 404,
      data: { detail: { code: "SHOW_NOT_FOUND" } },
    });

    await expect(getAdminShowByExactSlug("missing", { adminContext: ADMIN_CONTEXT })).resolves.toBeNull();
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledOnce();
  });

  it("uses the bounded v1 resolve/detail rollback when the v2 route is absent", async () => {
    fetchAdminBackendJsonMock
      .mockResolvedValueOnce({ status: 404, data: { detail: "Not Found" } })
      .mockResolvedValueOnce({ status: 200, data: legacyResolved() })
      .mockResolvedValueOnce({
        status: 200,
        data: { show: { ...exactShow(), canonical_slug: "rhobh", extra: true } },
      });

    await expect(getAdminShowByExactSlug("rhobh", { adminContext: ADMIN_CONTEXT })).resolves.toEqual(
      exactShow(),
    );
    expect(fetchAdminBackendJsonMock).toHaveBeenNthCalledWith(
      2,
      "/admin/trr-api/shows/resolve-slug",
      expect.objectContaining({
        apiVersion: "v1",
        adminContext: ADMIN_CONTEXT,
        queryString: "slug=rhobh",
      }),
    );
    expect(fetchAdminBackendJsonMock).toHaveBeenNthCalledWith(
      3,
      `/admin/trr-api/shows/${SHOW_ID}`,
      expect.objectContaining({ apiVersion: "v1", adminContext: ADMIN_CONTEXT }),
    );
  });

  it("does not treat an unstructured resource 404 as a missing v2 route", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 404,
      data: { detail: "show not found" },
    });

    await expect(getAdminShowByExactSlug("missing", { adminContext: ADMIN_CONTEXT })).rejects.toMatchObject({
      status: 404,
    });
    expect(buildAdminBackendStatusErrorMock).toHaveBeenCalledOnce();
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledOnce();
  });

  it("does not turn a legacy alias match into an exact slug collision", async () => {
    fetchAdminBackendJsonMock
      .mockResolvedValueOnce({ status: 503, data: { detail: { code: "DATABASE_SERVICE_UNAVAILABLE" } } })
      .mockResolvedValueOnce({ status: 200, data: legacyResolved("legacy-alias") })
      .mockResolvedValueOnce({
        status: 200,
        data: { show: exactShow("canonical-slug") },
      });

    await expect(
      getAdminShowByExactSlug("legacy-alias", { adminContext: ADMIN_CONTEXT }),
    ).resolves.toBeNull();
  });

  it("falls back for a transport availability error", async () => {
    fetchAdminBackendJsonMock
      .mockRejectedValueOnce(
        new MockAdminReadProxyError("unreachable", 502, {
          code: "BACKEND_UNREACHABLE",
          retryable: true,
        }),
      )
      .mockResolvedValueOnce({ status: 404, data: { detail: "show slug not found" } });

    await expect(getAdminShowByExactSlug("missing", { adminContext: ADMIN_CONTEXT })).resolves.toBeNull();
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledTimes(2);
  });

  it("rejects v2 response drift without hiding it behind the legacy path", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { show: { ...exactShow(), unexpected: true } },
    });

    await expect(getAdminShowByExactSlug("rhobh", { adminContext: ADMIN_CONTEXT })).rejects.toMatchObject({
      status: 502,
      code: "INVALID_BACKEND_RESPONSE",
    });
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledOnce();
  });

  it("rejects a v2 response whose stored slug does not exactly match the request", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { show: exactShow("different-slug") },
    });

    await expect(getAdminShowByExactSlug("rhobh", { adminContext: ADMIN_CONTEXT })).rejects.toMatchObject({
      status: 502,
      code: "INVALID_BACKEND_RESPONSE",
    });
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledOnce();
  });

  it("surfaces a structured v2 500 without hiding it behind the legacy path", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 500,
      data: { detail: { code: "SHOW_SLUG_REQUEST_FAILED" } },
    });

    await expect(getAdminShowByExactSlug("rhobh", { adminContext: ADMIN_CONTEXT })).rejects.toMatchObject({
      status: 500,
    });
    expect(buildAdminBackendStatusErrorMock).toHaveBeenCalledOnce();
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledOnce();
  });

  it("surfaces a non-availability proxy 500 without hiding it behind the legacy path", async () => {
    fetchAdminBackendJsonMock.mockRejectedValue(
      new MockAdminReadProxyError("proxy failed", 500, {
        code: "BACKEND_PROXY_FAILED",
        retryable: false,
      }),
    );

    await expect(getAdminShowByExactSlug("rhobh", { adminContext: ADMIN_CONTEXT })).rejects.toMatchObject({
      status: 500,
      code: "BACKEND_PROXY_FAILED",
    });
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledOnce();
  });

  it("does not fall back for auth failures", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 403,
      data: { detail: { code: "FORBIDDEN" } },
    });

    await expect(getAdminShowByExactSlug("rhobh", { adminContext: ADMIN_CONTEXT })).rejects.toMatchObject({
      status: 403,
    });
    expect(buildAdminBackendStatusErrorMock).toHaveBeenCalledOnce();
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledOnce();
  });

  it("does not call either backend contract for an empty normalized slug", async () => {
    await expect(getAdminShowByExactSlug("!!!", { adminContext: ADMIN_CONTEXT })).resolves.toBeNull();
    expect(fetchAdminBackendJsonMock).not.toHaveBeenCalled();
  });
});
