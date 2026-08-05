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
    detail?: Record<string, unknown>;

    constructor(
      message: string,
      status: number,
      options?: {
        code?: string;
        retryable?: boolean;
        detail?: Record<string, unknown>;
      },
    ) {
      super(message);
      this.status = status;
      this.code = options?.code;
      this.retryable = options?.retryable;
      this.detail = options?.detail;
    }
  },
}));

vi.mock("@/lib/server/trr-api/admin-read-proxy", () => ({
  AdminReadProxyError: MockAdminReadProxyError,
  ADMIN_READ_PROXY_PRIMARY_TIMEOUT_MS: 12_000,
  ADMIN_READ_PROXY_SHORT_TIMEOUT_MS: 5_000,
  buildAdminBackendStatusError: buildAdminBackendStatusErrorMock,
  fetchAdminBackendJson: fetchAdminBackendJsonMock,
}));

import {
  getNetworkStreamingDetail,
  getNetworksStreamingSummary,
} from "@/lib/server/trr-api/admin-networks-streaming-reads";

const ADMIN_CONTEXT = {
  uid: "signed-admin",
  email: "admin@example.com",
  verifiedAt: 1_721_100_000_000,
};

const summaryPayload = () => ({
  totals: {
    total_available_shows: 20,
    total_added_shows: 8,
  },
  rows: [
    {
      type: "network",
      name: "Bravo",
      available_show_count: 12,
      added_show_count: 5,
      hosted_logo_url: "https://cdn.example.com/bravo.png",
      hosted_logo_black_url: null,
      hosted_logo_white_url: null,
      wikidata_id: "Q123",
      wikipedia_url: "https://en.wikipedia.org/wiki/Bravo",
      tmdb_entity_id: "74",
      homepage_url: "https://www.bravotv.com",
      resolution_status: "resolved",
      resolution_reason: null,
      last_attempt_at: "2026-07-16T12:00:00Z",
      has_logo: true,
      has_bw_variants: false,
      has_links: true,
    },
  ],
  generated_at: "2026-07-16T12:01:00Z",
});

const detailPayload = () => ({
  entity_type: "network",
  entity_key: "bravo",
  entity_slug: "bravo",
  display_name: "Bravo",
  available_show_count: 12,
  added_show_count: 5,
  core: {
    entity_id: "74",
    origin_country: "US",
    display_priority: null,
    tmdb_logo_path: null,
    logo_path: null,
    hosted_logo_key: null,
    hosted_logo_url: "https://cdn.example.com/bravo.png",
    hosted_logo_black_url: null,
    hosted_logo_white_url: null,
    wikidata_id: "Q123",
    wikipedia_url: "https://en.wikipedia.org/wiki/Bravo",
    wikimedia_logo_file: null,
    link_enriched_at: "2026-07-16T12:00:00Z",
    link_enrichment_source: "wikidata",
    facebook_id: null,
    instagram_id: "bravotv",
    twitter_id: null,
    tiktok_id: null,
  },
  override: {
    id: null,
    display_name_override: null,
    wikidata_id_override: null,
    wikipedia_url_override: null,
    logo_source_urls_override: [],
    source_priority_override: [],
    aliases_override: [],
    notes: null,
    is_active: false,
    updated_by: null,
    updated_at: null,
  },
  completion: {
    resolution_status: "resolved",
    resolution_reason: null,
    last_attempt_at: "2026-07-16T12:00:00Z",
  },
  logo_assets: [],
  shows: [
    {
      trr_show_id: "5e9e61e7-70f6-48cb-9887-2d8c8ac130a3",
      show_name: "Top Chef",
      canonical_slug: "top-chef",
      poster_url: null,
    },
  ],
  family: null,
  family_suggestions: [],
  shared_links: [],
  wikipedia_show_urls: [],
});

describe("admin networks/streaming summary v2 adapter", () => {
  beforeEach(() => {
    fetchAdminBackendJsonMock.mockReset();
    buildAdminBackendStatusErrorMock.mockReset();
    buildAdminBackendStatusErrorMock.mockImplementation(
      ({ fallbackMessage, status }: { fallbackMessage: string; status: number }) =>
        new MockAdminReadProxyError(fallbackMessage, status),
    );
  });

  it("uses the signed strict v2 summary contract", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({ status: 200, data: summaryPayload() });

    await expect(getNetworksStreamingSummary({ adminContext: ADMIN_CONTEXT })).resolves.toEqual(
      summaryPayload(),
    );
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledOnce();
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/networks-streaming/summary",
      expect.objectContaining({
        apiVersion: "v2",
        adminContext: ADMIN_CONTEXT,
        routeName: "networks-streaming-summary",
      }),
    );
  });

  it("uses v1 only for an exactly missing v2 route", async () => {
    fetchAdminBackendJsonMock
      .mockResolvedValueOnce({ status: 404, data: { detail: "Not Found" } })
      .mockResolvedValueOnce({ status: 200, data: summaryPayload() });

    await expect(getNetworksStreamingSummary({ adminContext: ADMIN_CONTEXT })).resolves.toEqual(
      summaryPayload(),
    );
    expect(fetchAdminBackendJsonMock).toHaveBeenNthCalledWith(
      2,
      "/admin/shows/networks-streaming/summary",
      expect.objectContaining({
        apiVersion: "v1",
        adminContext: ADMIN_CONTEXT,
        routeName: "networks-streaming-summary-legacy",
      }),
    );
  });

  it("uses v1 when the v2 route rejects the method without a problem code", async () => {
    fetchAdminBackendJsonMock
      .mockResolvedValueOnce({ status: 405, data: { detail: "Method Not Allowed" } })
      .mockResolvedValueOnce({ status: 200, data: summaryPayload() });

    await expect(getNetworksStreamingSummary({ adminContext: ADMIN_CONTEXT })).resolves.toEqual(
      summaryPayload(),
    );
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledTimes(2);
  });

  it("uses v1 for an unstructured gateway availability response", async () => {
    fetchAdminBackendJsonMock
      .mockResolvedValueOnce({ status: 503, data: { error: "gateway unavailable" } })
      .mockResolvedValueOnce({ status: 200, data: summaryPayload() });

    await expect(getNetworksStreamingSummary({ adminContext: ADMIN_CONTEXT })).resolves.toEqual(
      summaryPayload(),
    );
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledTimes(2);
  });

  it("uses v1 for an explicit transport availability error", async () => {
    fetchAdminBackendJsonMock
      .mockRejectedValueOnce(
        new MockAdminReadProxyError("unreachable", 502, {
          code: "BACKEND_UNREACHABLE",
          retryable: true,
        }),
      )
      .mockResolvedValueOnce({ status: 200, data: summaryPayload() });

    await expect(getNetworksStreamingSummary({ adminContext: ADMIN_CONTEXT })).resolves.toEqual(
      summaryPayload(),
    );
  });

  it("surfaces a structured application 503 without falling back", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 503,
      data: { detail: { code: "DATABASE_SERVICE_UNAVAILABLE" } },
    });

    await expect(getNetworksStreamingSummary({ adminContext: ADMIN_CONTEXT })).rejects.toMatchObject({
      status: 503,
    });
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledOnce();
  });

  it("surfaces top-level structured failures without falling back", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 503,
      data: { code: "DATABASE_SERVICE_UNAVAILABLE", error: "database unavailable" },
    });

    await expect(getNetworksStreamingSummary({ adminContext: ADMIN_CONTEXT })).rejects.toMatchObject({
      status: 503,
    });
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledOnce();
  });

  it("does not treat a structured 404 as exact route absence", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 404,
      data: { detail: "Not Found", code: "ENTITY_NOT_FOUND" },
    });

    await expect(getNetworksStreamingSummary({ adminContext: ADMIN_CONTEXT })).rejects.toMatchObject({
      status: 404,
    });
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledOnce();
  });

  it("does not fall back for a structured 405 failure", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 405,
      data: { detail: { code: "ROUTE_DISABLED" } },
    });

    await expect(getNetworksStreamingSummary({ adminContext: ADMIN_CONTEXT })).rejects.toMatchObject({
      status: 405,
    });
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledOnce();
  });

  it("rejects malformed v2 success without hiding drift behind v1", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: { ...summaryPayload(), unexpected: true },
    });

    await expect(getNetworksStreamingSummary({ adminContext: ADMIN_CONTEXT })).rejects.toMatchObject({
      status: 502,
      code: "INVALID_BACKEND_RESPONSE",
    });
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledOnce();
  });

  it("rejects invalid counts and timestamps", async () => {
    const payload = summaryPayload();
    payload.rows[0].available_show_count = -1;
    payload.generated_at = "not-a-date";
    fetchAdminBackendJsonMock.mockResolvedValue({ status: 200, data: payload });

    await expect(getNetworksStreamingSummary({ adminContext: ADMIN_CONTEXT })).rejects.toMatchObject({
      status: 502,
      code: "INVALID_BACKEND_RESPONSE",
    });
  });

  it("rejects parseable dates that are not RFC 3339 timestamps", async () => {
    const payload = summaryPayload();
    payload.generated_at = "July 16, 2026";
    fetchAdminBackendJsonMock.mockResolvedValue({ status: 200, data: payload });

    await expect(getNetworksStreamingSummary({ adminContext: ADMIN_CONTEXT })).rejects.toMatchObject({
      status: 502,
      code: "INVALID_BACKEND_RESPONSE",
    });
  });

  it("rejects calendar-invalid RFC 3339-shaped timestamps", async () => {
    const payload = summaryPayload();
    payload.generated_at = "2026-02-30T12:00:00Z";
    fetchAdminBackendJsonMock.mockResolvedValue({ status: 200, data: payload });

    await expect(getNetworksStreamingSummary({ adminContext: ADMIN_CONTEXT })).rejects.toMatchObject({
      status: 502,
      code: "INVALID_BACKEND_RESPONSE",
    });
  });

  it("does not fall back for auth failures", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 403,
      data: { detail: { code: "FORBIDDEN" } },
    });

    await expect(getNetworksStreamingSummary({ adminContext: ADMIN_CONTEXT })).rejects.toMatchObject({
      status: 403,
    });
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledOnce();
  });
});

describe("admin networks/streaming detail v2 adapter", () => {
  beforeEach(() => {
    fetchAdminBackendJsonMock.mockReset();
    buildAdminBackendStatusErrorMock.mockReset();
    buildAdminBackendStatusErrorMock.mockImplementation(
      ({ fallbackMessage, status }: { fallbackMessage: string; status: number }) =>
        new MockAdminReadProxyError(fallbackMessage, status),
    );
  });

  const input = {
    entity_type: "network" as const,
    entity_key: "Bravo",
    show_scope: "added" as const,
  };

  it("uses the signed strict v2 detail contract", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({ status: 200, data: detailPayload() });

    await expect(
      getNetworkStreamingDetail(input, { adminContext: ADMIN_CONTEXT }),
    ).resolves.toEqual(detailPayload());
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledWith(
      "/admin/networks-streaming/detail",
      expect.objectContaining({
        apiVersion: "v2",
        adminContext: ADMIN_CONTEXT,
        queryString: "entity_type=network&entity_key=bravo",
        routeName: "networks-streaming-detail",
      }),
    );
  });

  it("uses v1 only when the v2 detail route is exactly absent", async () => {
    fetchAdminBackendJsonMock
      .mockResolvedValueOnce({ status: 404, data: { detail: "Not Found" } })
      .mockResolvedValueOnce({ status: 200, data: detailPayload() });

    await expect(
      getNetworkStreamingDetail(input, { adminContext: ADMIN_CONTEXT }),
    ).resolves.toEqual(detailPayload());
    expect(fetchAdminBackendJsonMock).toHaveBeenNthCalledWith(
      2,
      "/admin/shows/networks-streaming/detail",
      expect.objectContaining({
        apiVersion: "v1",
        adminContext: ADMIN_CONTEXT,
        queryString: "entity_type=network&entity_key=bravo",
        routeName: "networks-streaming-detail-legacy",
      }),
    );
  });

  it("normalizes known PostgreSQL timestamp text only on the v1 rollback path", async () => {
    const base = detailPayload();
    const legacyPayload = {
      ...base,
      core: { ...base.core, link_enriched_at: "2026-07-16 12:00:00+00" },
      override: { ...base.override, updated_at: "2026-07-16 12:01:00.123+0000" },
      completion: { ...base.completion, last_attempt_at: "2026-07-16 12:02:00+00:00" },
      logo_assets: [
        {
          id: "logo-1",
          source: "override",
          source_url: "https://images.example.com/bravo.svg",
          source_rank: 1,
          hosted_logo_url: null,
          hosted_logo_content_type: null,
          base_logo_format: "svg",
          pixel_width: null,
          pixel_height: null,
          mirror_status: "skipped",
          failure_reason: null,
          is_primary: true,
          updated_at: "2026-07-16 12:03:00+00",
        },
      ],
      family: {
        id: "family-1",
        family_key: "nbcu",
        display_name: "NBCUniversal",
        owner_wikidata_id: "Q664",
        owner_label: "NBCUniversal",
        is_active: true,
        notes: null,
        metadata: {},
        created_by: null,
        updated_by: null,
        created_at: "2026-07-16 12:04:00+00",
        updated_at: "2026-07-16 12:05:00+00",
        members: [
          {
            id: "member-1",
            family_id: "family-1",
            entity_type: "network",
            entity_key: "bravo",
            entity_display_name: "Bravo",
            source: "manual",
            confidence: 1,
            metadata: {},
            created_by: null,
            updated_by: null,
            created_at: "2026-07-16 12:06:00+00",
            updated_at: "2026-07-16 12:07:00+00",
          },
        ],
      },
      family_suggestions: [
        {
          owner_wikidata_id: "Q664",
          owner_label: "NBCUniversal",
          entity_count: 2,
          entities: [
            {
              entity_type: "network",
              entity_key: "bravo",
              display_name: "Bravo",
              updated_at: "2026-07-16 12:08:00+00",
            },
            {
              entity_type: "streaming",
              entity_key: "peacock",
              display_name: "Peacock",
              updated_at: "2026-07-16 12:09:00+00",
            },
          ],
        },
      ],
      shared_links: [
        {
          id: "link-1",
          family_id: "family-1",
          link_group: "official",
          link_kind: "homepage",
          label: "NBCUniversal",
          url: "https://www.nbcuniversal.com",
          url_key: "https://www.nbcuniversal.com",
          coverage_type: "family_all_shows",
          coverage_value: null,
          source: "manual",
          priority: 1,
          auto_apply: true,
          is_active: true,
          metadata: {},
          created_at: "2026-07-16 12:10:00+00",
          updated_at: "2026-07-16 12:11:00+00",
          created_by: null,
          updated_by: null,
        },
      ],
      wikipedia_show_urls: [
        {
          id: "wiki-1",
          family_id: "family-1",
          entity_type: "network",
          entity_key: "bravo",
          brand_wikipedia_url: "https://en.wikipedia.org/wiki/Bravo_(American_TV_network)",
          show_url: "https://en.wikipedia.org/wiki/Top_Chef",
          show_url_key: "https://en.wikipedia.org/wiki/Top_Chef",
          show_title: "Top Chef",
          wikidata_id: "Q123",
          matched_show_id: null,
          match_method: null,
          import_source: "wikipedia",
          is_applied: false,
          metadata: {},
          last_seen_at: "2026-07-16 12:12:00+00",
          created_at: "2026-07-16 12:13:00+00",
          updated_at: "2026-07-16 12:14:00+00",
        },
      ],
    };
    fetchAdminBackendJsonMock
      .mockResolvedValueOnce({ status: 404, data: { detail: "Not Found" } })
      .mockResolvedValueOnce({ status: 200, data: legacyPayload });

    const result = await getNetworkStreamingDetail(input, { adminContext: ADMIN_CONTEXT });

    expect(result.core.link_enriched_at).toBe("2026-07-16T12:00:00+00:00");
    expect(result.override.updated_at).toBe("2026-07-16T12:01:00.123+00:00");
    expect(result.logo_assets[0].updated_at).toBe("2026-07-16T12:03:00+00:00");
    expect(result.family?.members[0].updated_at).toBe("2026-07-16T12:07:00+00:00");
    expect(result.family_suggestions[0].entities[1].updated_at).toBe(
      "2026-07-16T12:09:00+00:00",
    );
    expect(result.shared_links[0].updated_at).toBe("2026-07-16T12:11:00+00:00");
    expect(result.wikipedia_show_urls[0].last_seen_at).toBe("2026-07-16T12:12:00+00:00");
  });

  it("surfaces a typed v2 not-found with strict suggestions and never falls back", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 404,
      data: {
        detail: {
          code: "NETWORKS_STREAMING_ENTITY_NOT_FOUND",
          status: 404,
          message: "Networks/streaming entity not found.",
          trace_id: "trace-1",
          request_id: "request-1",
          retryable: false,
          suggestions: [
            {
              entity_type: "network",
              name: "Bravo",
              entity_slug: "bravo",
              available_show_count: 12,
              added_show_count: 5,
            },
          ],
        },
      },
    });

    await expect(
      getNetworkStreamingDetail(
        { ...input, entity_key: null, entity_slug: "brva" },
        { adminContext: ADMIN_CONTEXT },
      ),
    ).rejects.toMatchObject({
      status: 404,
      code: "NETWORKS_STREAMING_ENTITY_NOT_FOUND",
      detail: {
        suggestions: [expect.objectContaining({ entity_slug: "bravo" })],
      },
    });
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledOnce();
  });

  it("rejects malformed v2 not-found problem envelopes without falling back", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 404,
      data: {
        detail: {
          code: "NETWORKS_STREAMING_ENTITY_NOT_FOUND",
          status: 404,
          message: "Networks/streaming entity not found.",
          trace_id: "trace-1",
          request_id: "request-1",
          retryable: true,
          suggestions: [],
          unexpected: true,
        },
      },
    });

    await expect(
      getNetworkStreamingDetail(input, { adminContext: ADMIN_CONTEXT }),
    ).rejects.toMatchObject({
      status: 502,
      code: "INVALID_BACKEND_RESPONSE",
    });
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledOnce();
  });

  it("preserves a typed legacy not-found after an allowed route rollback", async () => {
    fetchAdminBackendJsonMock
      .mockResolvedValueOnce({ status: 404, data: { detail: "Not Found" } })
      .mockResolvedValueOnce({
        status: 404,
        data: {
          error: "not_found",
          suggestions: [
            {
              entity_type: "network",
              name: "Bravo",
              entity_slug: "bravo",
              available_show_count: 12,
              added_show_count: 5,
            },
          ],
        },
      });

    await expect(
      getNetworkStreamingDetail(input, { adminContext: ADMIN_CONTEXT }),
    ).rejects.toMatchObject({
      status: 404,
      code: "NETWORKS_STREAMING_ENTITY_NOT_FOUND",
    });
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledTimes(2);
  });

  it("rejects malformed nested success without hiding drift behind v1", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 200,
      data: {
        ...detailPayload(),
        core: { ...detailPayload().core, unexpected: true },
      },
    });

    await expect(
      getNetworkStreamingDetail(input, { adminContext: ADMIN_CONTEXT }),
    ).rejects.toMatchObject({
      status: 502,
      code: "INVALID_BACKEND_RESPONSE",
    });
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledOnce();
  });

  it("does not fall back for structured availability or auth failures", async () => {
    fetchAdminBackendJsonMock.mockResolvedValue({
      status: 503,
      data: { detail: { code: "DATABASE_SERVICE_UNAVAILABLE" } },
    });

    await expect(
      getNetworkStreamingDetail(input, { adminContext: ADMIN_CONTEXT }),
    ).rejects.toMatchObject({ status: 503 });
    expect(fetchAdminBackendJsonMock).toHaveBeenCalledOnce();
  });

  it("rejects semantically invalid RFC 3339 fields", async () => {
    const payload = detailPayload();
    payload.core.link_enriched_at = "2026-02-30T12:00:00Z";
    fetchAdminBackendJsonMock.mockResolvedValue({ status: 200, data: payload });

    await expect(
      getNetworkStreamingDetail(input, { adminContext: ADMIN_CONTEXT }),
    ).rejects.toMatchObject({
      status: 502,
      code: "INVALID_BACKEND_RESPONSE",
    });
  });

  it("does not accept legacy PostgreSQL timestamp text on the strict v2 path", async () => {
    const payload = detailPayload();
    payload.core.link_enriched_at = "2026-07-16 12:00:00+00";
    fetchAdminBackendJsonMock.mockResolvedValue({ status: 200, data: payload });

    await expect(
      getNetworkStreamingDetail(input, { adminContext: ADMIN_CONTEXT }),
    ).rejects.toMatchObject({
      status: 502,
      code: "INVALID_BACKEND_RESPONSE",
    });
  });
});
