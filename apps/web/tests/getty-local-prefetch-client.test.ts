import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  GettyLocalPrefetchError,
  prefetchGettyLocallyForPerson,
  type GettyLocalPrefetchProgressState,
} from "@/lib/admin/getty-local-prefetch";

describe("prefetchGettyLocallyForPerson", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("kicks off a Getty job, polls status, and emits live progress", async () => {
    const progressEvents: GettyLocalPrefetchProgressState[] = [];
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            prefetch_token: "token-1",
            status: "queued",
            stage: "queued",
            progress_message: "Queued Getty discovery job.",
            poll_after_ms: 1,
          }),
          { status: 202 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            prefetch_token: "token-1",
            status: "running",
            stage: "discovery",
            progress_message: "Broad Search page 2: 60 new, 120 total candidates.",
            heartbeat_at: "2026-03-24T16:00:00.000Z",
            current_page: 2,
            fetched_candidates_total: 120,
            active_query: {
              label: "Broad Search",
              phrase: "Brandi Glanville",
            },
            poll_after_ms: 1,
          }),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            prefetch_token: "token-1",
            status: "completed",
            prefetch_mode: "discovery",
            discovery_ready: true,
            enrichment_pending: true,
            merged_total: 72,
            merged_events_total: 0,
            candidate_manifest_total: 72,
            detail_enrichment_total: 72,
            deferred_editorial_ids: ["123"],
            query_summaries: [{ label: "Broad Search" }],
            auth_mode: "chrome_profile_browser_session",
            elapsed_seconds: 12.3,
          }),
          { status: 200 }
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await prefetchGettyLocallyForPerson("Brandi Glanville", "RHOBH", {
      mode: "discovery",
      onProgress: (state) => progressEvents.push(state),
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.bodyPatch.getty_prefetch_token).toBe("token-1");
    expect(result.candidateManifestTotal).toBe(72);
    expect(result.enrichmentPending).toBe(true);
    expect(progressEvents.at(-1)?.status).toBe("completed");
    expect(progressEvents.some((event) => event.currentPage === 2)).toBe(true);
  });

  it("surfaces terminal Getty job failures with the structured error code", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            prefetch_token: "token-2",
            status: "queued",
            poll_after_ms: 1,
          }),
          { status: 202 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            prefetch_token: "token-2",
            status: "failed",
            last_error: "Getty browser bridge crashed",
            last_error_code: "SCRAPE_FAILED",
          }),
          { status: 200 }
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      prefetchGettyLocallyForPerson("Brandi Glanville", null, { mode: "discovery" })
    ).rejects.toMatchObject<GettyLocalPrefetchError>({
      name: "GettyLocalPrefetchError",
      code: "SCRAPE_FAILED",
      message: "Getty browser bridge crashed",
    });
  });

  it("surfaces Getty profile authentication failures from kickoff", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          detail: "Getty profile is not authenticated in the codex Chrome profile.",
          last_error_code: "getty_profile_not_authenticated",
        }),
        { status: 500 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      prefetchGettyLocallyForPerson("Brandi Glanville", null, { mode: "discovery" })
    ).rejects.toMatchObject<GettyLocalPrefetchError>({
      name: "GettyLocalPrefetchError",
      code: "getty_profile_not_authenticated",
      message: expect.stringContaining("Getty profile is not authenticated"),
    });
  });

  it("surfaces Getty session truncation failures from polling", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            prefetch_token: "token-3",
            status: "queued",
            poll_after_ms: 1,
          }),
          { status: 202 }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            prefetch_token: "token-3",
            status: "failed",
            last_error: "Getty session appears truncated after page 3. Getty rewrote page 4 to page 1.",
            last_error_code: "getty_session_truncated",
          }),
          { status: 200 }
        )
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      prefetchGettyLocallyForPerson("Brandi Glanville", null, { mode: "discovery" })
    ).rejects.toMatchObject<GettyLocalPrefetchError>({
      name: "GettyLocalPrefetchError",
      code: "getty_session_truncated",
      message: expect.stringContaining("truncated after page 3"),
    });
  });
});
