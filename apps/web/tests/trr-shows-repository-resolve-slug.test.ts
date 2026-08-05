import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  fetchAdminBackendJsonMock,
  getBackendRootUrlMock,
  reactCacheEntries,
  timeoutSafeFetchMock,
} = vi.hoisted(() => ({
  fetchAdminBackendJsonMock: vi.fn(),
  getBackendRootUrlMock: vi.fn(),
  reactCacheEntries: new Map<string, Promise<unknown>>(),
  timeoutSafeFetchMock: vi.fn(),
}));

vi.mock("@/lib/server/trr-api/backend", () => ({
  getBackendRootUrl: getBackendRootUrlMock,
}));

vi.mock("@/lib/server/timeout-safe-fetch", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/timeout-safe-fetch")>();
  return { ...actual, timeoutSafeFetch: timeoutSafeFetchMock };
});

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS: 5_000,
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    cache:
      <TResult,>(loader: (key: string) => Promise<TResult>) =>
      (key: string): Promise<TResult> => {
        const existing = reactCacheEntries.get(key);
        if (existing) return existing as Promise<TResult>;
        const pending = loader(key);
        reactCacheEntries.set(key, pending);
        return pending;
      },
  };
});

import {
  PublicIdentityApiError,
  resolveShowSlug,
} from "@/lib/server/trr-api/public-identities";

const SHOW_ID = "11111111-2222-4333-8444-555555555555";
const PUBLIC_SHOW = {
  resource_type: "show",
  show_id: SHOW_ID,
  show_name: "The Valley",
  requested_slug: "valley",
  canonical_slug: "the-valley",
  match_kind: "alias",
  canonical_path: "/shows/the-valley",
} as const;

const problem = (status: number, code: string) => ({
  detail: {
    code,
    status,
    message: "Show identity could not be resolved.",
    trace_id: `trace-${status}`,
    request_id: `request-${status}`,
    retryable: status >= 500,
    detail: { resource_type: "show" },
  },
});

describe("resolveShowSlug compatibility adapter", () => {
  beforeEach(() => {
    fetchAdminBackendJsonMock.mockReset();
    getBackendRootUrlMock.mockReset();
    timeoutSafeFetchMock.mockReset();
    reactCacheEntries.clear();
    getBackendRootUrlMock.mockImplementation((path: string) => `https://api.trr.localhost${path}`);
  });

  it("maps the public v2 identity into the legacy admin shape", async () => {
    timeoutSafeFetchMock.mockResolvedValue(Response.json(PUBLIC_SHOW));

    await expect(resolveShowSlug("Valley")).resolves.toEqual({
      show_id: SHOW_ID,
      slug: "the-valley",
      canonical_slug: "the-valley",
      show_name: "The Valley",
    });

    expect(getBackendRootUrlMock).toHaveBeenCalledWith("/api/v2/identities/shows/valley");
    expect(fetchAdminBackendJsonMock).not.toHaveBeenCalled();
  });

  it("preserves a collision suffix while normalizing the base slug", async () => {
    timeoutSafeFetchMock.mockResolvedValue(
      Response.json({
        ...PUBLIC_SHOW,
        requested_slug: "the-valley--abcdef12",
        canonical_slug: "the-valley--abcdef1234567890abcdef1234567890",
        canonical_path: "/shows/the-valley--abcdef1234567890abcdef1234567890",
      }),
    );

    await resolveShowSlug("The Valley--ABCDEF12");

    expect(getBackendRootUrlMock).toHaveBeenCalledWith(
      "/api/v2/identities/shows/the-valley--abcdef12",
    );
  });

  it("falls back to the v1 backend resolver when v2 is unavailable for N/N+1", async () => {
    timeoutSafeFetchMock.mockResolvedValue(
      Response.json(problem(404, "IDENTITY_NOT_FOUND"), { status: 404 }),
    );
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        resolved: {
          show_id: SHOW_ID,
          slug: "rhobh",
          canonical_slug: "rhobh",
          show_name: "The Real Housewives of Beverly Hills",
        },
      },
    });

    await expect(resolveShowSlug("RHOBH")).resolves.toEqual({
      show_id: SHOW_ID,
      slug: "rhobh",
      canonical_slug: "rhobh",
      show_name: "The Real Housewives of Beverly Hills",
    });
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/trr-api/shows/resolve-slug?slug=rhobh",
      {
        apiVersion: "v1",
        routeName: "show-resolve-slug-compatibility",
        timeoutMs: 15_000,
      },
    );
  });

  it("does not let the legacy resolver choose an ambiguous v2 alias", async () => {
    timeoutSafeFetchMock.mockResolvedValue(
      Response.json(problem(409, "IDENTITY_AMBIGUOUS"), { status: 409 }),
    );

    await expect(resolveShowSlug("shared-alias")).resolves.toBeNull();
    expect(fetchAdminBackendJsonMock).not.toHaveBeenCalled();
  });

  it("returns null for a legacy 404 and rejects malformed legacy success payloads", async () => {
    timeoutSafeFetchMock.mockResolvedValue(
      Response.json(problem(404, "IDENTITY_NOT_FOUND"), { status: 404 }),
    );
    fetchAdminBackendJsonMock.mockResolvedValueOnce({ status: 404, data: {} });

    await expect(resolveShowSlug("missing")).resolves.toBeNull();

    reactCacheEntries.clear();
    timeoutSafeFetchMock.mockResolvedValue(
      Response.json(problem(404, "IDENTITY_NOT_FOUND"), { status: 404 }),
    );
    fetchAdminBackendJsonMock.mockResolvedValueOnce({
      status: 200,
      data: { resolved: { show_id: "not-a-uuid" } },
    });

    await expect(resolveShowSlug("malformed")).rejects.toMatchObject({
      status: 502,
      code: "INVALID_BACKEND_RESPONSE",
    } satisfies Partial<PublicIdentityApiError>);
  });
});
