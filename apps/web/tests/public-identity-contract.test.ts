import { beforeEach, describe, expect, it, vi } from "vitest";

const { getBackendRootUrlMock, reactCacheEntries, timeoutSafeFetchMock } = vi.hoisted(() => ({
  getBackendRootUrlMock: vi.fn(),
  reactCacheEntries: new Map<string, Promise<unknown>>(),
  timeoutSafeFetchMock: vi.fn(),
}));

vi.mock("@/lib/server/trr-api/backend", () => ({
  getBackendRootUrl: getBackendRootUrlMock,
}));

vi.mock("@/lib/server/timeout-safe-fetch", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/timeout-safe-fetch")>();
  return {
    ...actual,
    timeoutSafeFetch: timeoutSafeFetchMock,
  };
});

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

import { TimeoutSafeFetchTimeoutError } from "@/lib/server/timeout-safe-fetch";
import {
  PublicIdentityApiError,
  resolvePublicPersonIdentity,
  resolvePublicSeasonIdentity,
  resolvePublicShowIdentity,
} from "@/lib/server/trr-api/public-identities";

const SHOW_RESPONSE = {
  resource_type: "show",
  show_id: "11111111-1111-4111-8111-111111111111",
  show_name: "The Valley",
  requested_slug: "valley",
  canonical_slug: "the-valley",
  match_kind: "alias",
  canonical_path: "/shows/the-valley",
} as const;

const SEASON_RESPONSE = {
  resource_type: "season",
  season_id: "22222222-2222-4222-8222-222222222222",
  show_id: SHOW_RESPONSE.show_id,
  show_name: "The Valley",
  season_number: 2,
  season_title: "Season 2",
  requested_show_slug: "valley",
  canonical_show_slug: "the-valley",
  show_match_kind: "alias",
  canonical_path: "/shows/the-valley/seasons/2",
} as const;

const PERSON_RESPONSE = {
  resource_type: "person",
  person_id: "33333333-3333-4333-8333-333333333333",
  full_name: "Alex Smith",
  requested_slug: "alex-smith",
  canonical_slug: "alex-smith--33333333",
  match_kind: "alias",
  canonical_path: "/people/alex-smith--33333333",
  show_context: {
    show_id: SHOW_RESPONSE.show_id,
    show_name: SHOW_RESPONSE.show_name,
    canonical_slug: SHOW_RESPONSE.canonical_slug,
  },
} as const;

const PROBLEM_DETAIL = {
  code: "IDENTITY_NOT_FOUND",
  status: 404,
  message: "The requested identity was not found.",
  trace_id: "trace-123",
  request_id: "request-123",
  retryable: false,
  detail: { resource_type: "show" },
} as const;

const readApiError = async (request: Promise<unknown>): Promise<PublicIdentityApiError> => {
  try {
    await request;
  } catch (error) {
    expect(error).toBeInstanceOf(PublicIdentityApiError);
    return error as PublicIdentityApiError;
  }
  throw new Error("Expected public identity request to reject");
};

describe("public identity API contract", () => {
  beforeEach(() => {
    getBackendRootUrlMock.mockReset();
    timeoutSafeFetchMock.mockReset();
    reactCacheEntries.clear();
    getBackendRootUrlMock.mockImplementation((path: string) => `https://api.trr.localhost${path}`);
  });

  it("resolves a show through the public v2 endpoint with bounded anonymous fetch options", async () => {
    timeoutSafeFetchMock.mockResolvedValue(Response.json(SHOW_RESPONSE));

    await expect(resolvePublicShowIdentity("valley")).resolves.toEqual(SHOW_RESPONSE);

    expect(getBackendRootUrlMock).toHaveBeenCalledWith("/api/v2/identities/shows/valley");
    expect(timeoutSafeFetchMock).toHaveBeenCalledWith(
      "https://api.trr.localhost/api/v2/identities/shows/valley",
      {
        cache: "no-store",
        credentials: "omit",
        headers: { Accept: "application/json" },
        timeoutMs: 20_000,
        timeoutName: "public-identity-v2",
      },
    );
  });

  it("encodes season path segments and validates the season response", async () => {
    timeoutSafeFetchMock.mockResolvedValue(Response.json(SEASON_RESPONSE));

    await expect(resolvePublicSeasonIdentity("valley alias", 2)).resolves.toEqual(SEASON_RESPONSE);

    expect(getBackendRootUrlMock).toHaveBeenCalledWith(
      "/api/v2/identities/shows/valley%20alias/seasons/2",
    );
  });

  it("uses only show_id person context when a show UUID is provided", async () => {
    timeoutSafeFetchMock.mockResolvedValue(Response.json(PERSON_RESPONSE));

    await expect(
      resolvePublicPersonIdentity("alex smith", { showId: SHOW_RESPONSE.show_id }),
    ).resolves.toEqual(PERSON_RESPONSE);

    expect(timeoutSafeFetchMock.mock.calls[0]?.[0]).toBe(
      `https://api.trr.localhost/api/v2/identities/people/alex%20smith?show_id=${SHOW_RESPONSE.show_id}`,
    );
  });

  it("uses only show_slug person context when a show slug is provided", async () => {
    timeoutSafeFetchMock.mockResolvedValue(Response.json(PERSON_RESPONSE));

    await resolvePublicPersonIdentity("alex-smith", { showSlug: "the valley" });

    expect(timeoutSafeFetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.trr.localhost/api/v2/identities/people/alex-smith?show_slug=the+valley",
    );
  });

  it("never emits both person context parameters even for an invalid runtime object", async () => {
    timeoutSafeFetchMock.mockResolvedValue(Response.json(PERSON_RESPONSE));
    const invalidRuntimeContext = {
      showId: SHOW_RESPONSE.show_id,
      showSlug: "the-valley",
    } as unknown as Parameters<typeof resolvePublicPersonIdentity>[1];

    await resolvePublicPersonIdentity("alex-smith", invalidRuntimeContext);

    const requestedUrl = String(timeoutSafeFetchMock.mock.calls[0]?.[0]);
    expect(requestedUrl).toContain(`show_id=${SHOW_RESPONSE.show_id}`);
    expect(requestedUrl).not.toContain("show_slug=");
  });

  it("deduplicates identical requests through the shared React cache loader", async () => {
    timeoutSafeFetchMock.mockResolvedValue(Response.json(SHOW_RESPONSE));

    const [first, second] = await Promise.all([
      resolvePublicShowIdentity("valley"),
      resolvePublicShowIdentity("valley"),
    ]);

    expect(first).toEqual(SHOW_RESPONSE);
    expect(second).toEqual(SHOW_RESPONSE);
    expect(timeoutSafeFetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns a typed configuration error without issuing a request", async () => {
    getBackendRootUrlMock.mockReturnValue(null);

    const error = await readApiError(resolvePublicShowIdentity("valley"));

    expect(error).toMatchObject({
      status: 500,
      code: "BACKEND_NOT_CONFIGURED",
      retryable: false,
      problem: null,
    });
    expect(timeoutSafeFetchMock).not.toHaveBeenCalled();
  });

  it.each([400, 404, 409, 500, 503])(
    "preserves a valid backend problem response with HTTP %s",
    async (status) => {
      const detail = {
        ...PROBLEM_DETAIL,
        status,
        code: `UPSTREAM_${status}`,
      };
      timeoutSafeFetchMock.mockResolvedValue(Response.json({ detail }, { status }));

      const error = await readApiError(resolvePublicShowIdentity(`problem-${status}`));

      expect(error).toMatchObject({
        status,
        code: `UPSTREAM_${status}`,
        retryable: false,
        problem: detail,
      });
      expect(error.message).toBe(detail.message);
    },
  );

  it("maps a transport timeout to a typed 504", async () => {
    timeoutSafeFetchMock.mockRejectedValue(
      new TimeoutSafeFetchTimeoutError("timed out", {
        timeoutMs: 20_000,
        timeoutName: "public-identity-v2",
      }),
    );

    const error = await readApiError(resolvePublicShowIdentity("timeout"));

    expect(error).toMatchObject({ status: 504, code: "BACKEND_TIMEOUT", retryable: true });
  });

  it("maps other transport failures to a typed 502", async () => {
    timeoutSafeFetchMock.mockRejectedValue(new TypeError("fetch failed"));

    const error = await readApiError(resolvePublicShowIdentity("unreachable"));

    expect(error).toMatchObject({
      status: 502,
      code: "BACKEND_UNREACHABLE",
      retryable: true,
    });
  });

  it.each([
    ["wrong resource type", { ...SHOW_RESPONSE, resource_type: "person" }],
    ["invalid UUID", { ...SHOW_RESPONSE, show_id: "not-a-uuid" }],
    ["invalid match kind", { ...SHOW_RESPONSE, match_kind: "legacy" }],
    ["unsafe show path", { ...SHOW_RESPONSE, canonical_path: "https://evil.example/show" }],
    ["unsafe canonical slug", { ...SHOW_RESPONSE, canonical_slug: "../admin", canonical_path: "/shows/../admin" }],
    ["extra show field", { ...SHOW_RESPONSE, debug_secret: "leak-me" }],
  ])("rejects a malformed show success payload: %s", async (_label, payload) => {
    timeoutSafeFetchMock.mockResolvedValue(Response.json(payload));

    const error = await readApiError(resolvePublicShowIdentity("bad-show"));

    expect(error).toMatchObject({ status: 502, code: "INVALID_BACKEND_RESPONSE" });
  });

  it.each([
    ["non-integer season", { ...SEASON_RESPONSE, season_number: 2.5 }],
    ["unsafe season path", { ...SEASON_RESPONSE, canonical_path: "/shows/the-valley/seasons/3" }],
    ["missing season title", { ...SEASON_RESPONSE, season_title: undefined }],
    ["extra season field", { ...SEASON_RESPONSE, debug_secret: "leak-me" }],
  ])("rejects a malformed season success payload: %s", async (_label, payload) => {
    timeoutSafeFetchMock.mockResolvedValue(Response.json(payload));

    const error = await readApiError(resolvePublicSeasonIdentity("valley", 2));

    expect(error).toMatchObject({ status: 502, code: "INVALID_BACKEND_RESPONSE" });
  });

  it("accepts a person identity when optional show context is omitted", async () => {
    const responseWithoutShowContext: Record<string, unknown> = { ...PERSON_RESPONSE };
    delete responseWithoutShowContext.show_context;
    timeoutSafeFetchMock.mockResolvedValue(Response.json(responseWithoutShowContext));

    await expect(resolvePublicPersonIdentity("alex-smith")).resolves.toEqual({
      ...PERSON_RESPONSE,
      show_context: null,
    });
  });

  it.each([
    ["unsafe person path", { ...PERSON_RESPONSE, canonical_path: "/people/someone-else" }],
    ["invalid person context", { ...PERSON_RESPONSE, show_context: { show_id: "bad" } }],
    ["extra person field", { ...PERSON_RESPONSE, debug_secret: "leak-me" }],
    [
      "extra person context field",
      {
        ...PERSON_RESPONSE,
        show_context: { ...PERSON_RESPONSE.show_context, debug_secret: "leak-me" },
      },
    ],
  ])("rejects a malformed person success payload: %s", async (_label, payload) => {
    timeoutSafeFetchMock.mockResolvedValue(Response.json(payload));

    const error = await readApiError(resolvePublicPersonIdentity("alex-smith"));

    expect(error).toMatchObject({ status: 502, code: "INVALID_BACKEND_RESPONSE" });
  });

  it("rejects a malformed backend problem instead of trusting its status or code", async () => {
    timeoutSafeFetchMock.mockResolvedValue(
      Response.json(
        { detail: { ...PROBLEM_DETAIL, status: 500, code: "SPOOFED_STATUS" } },
        { status: 404 },
      ),
    );

    const error = await readApiError(resolvePublicShowIdentity("bad-problem"));

    expect(error).toMatchObject({ status: 502, code: "INVALID_BACKEND_RESPONSE" });
    expect(error.problem).toBeNull();
  });

  it("rejects a preserved backend problem envelope with extra fields", async () => {
    timeoutSafeFetchMock.mockResolvedValue(
      Response.json({ detail: PROBLEM_DETAIL, debug_secret: "leak-me" }, { status: 404 }),
    );

    const error = await readApiError(resolvePublicShowIdentity("bad-problem-envelope"));

    expect(error).toMatchObject({ status: 502, code: "INVALID_BACKEND_RESPONSE" });
    expect(error.problem).toBeNull();
  });

  it("rejects a preserved backend problem detail with extra fields", async () => {
    timeoutSafeFetchMock.mockResolvedValue(
      Response.json(
        { detail: { ...PROBLEM_DETAIL, debug_secret: "leak-me" } },
        { status: 404 },
      ),
    );

    const error = await readApiError(resolvePublicShowIdentity("bad-problem-detail"));

    expect(error).toMatchObject({ status: 502, code: "INVALID_BACKEND_RESPONSE" });
    expect(error.problem).toBeNull();
  });

  it("rejects invalid JSON from the backend", async () => {
    timeoutSafeFetchMock.mockResolvedValue(
      new Response("not-json", { status: 200, headers: { "content-type": "text/plain" } }),
    );

    const error = await readApiError(resolvePublicShowIdentity("bad-json"));

    expect(error).toMatchObject({ status: 502, code: "INVALID_BACKEND_RESPONSE" });
  });

  it("does not preserve uncontracted upstream statuses", async () => {
    timeoutSafeFetchMock.mockResolvedValue(
      Response.json({ detail: { ...PROBLEM_DETAIL, status: 429 } }, { status: 429 }),
    );

    const error = await readApiError(resolvePublicShowIdentity("rate-limited"));

    expect(error).toMatchObject({ status: 502, code: "INVALID_BACKEND_RESPONSE" });
  });
});
