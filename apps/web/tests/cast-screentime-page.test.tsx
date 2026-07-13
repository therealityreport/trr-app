import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import CastScreentimePageClient from "@/app/admin/cast-screentime/CastScreentimePageClient";

const navigationState = vi.hoisted(() => ({
  pathname: "/admin/cast-screentime",
  search: "show_id=show-1",
}));

const mocks = vi.hoisted(() => ({
  fetchAdminWithAuth: vi.fn(),
  clipboardWriteText: vi.fn(),
  guardState: {
    checking: false,
    hasAccess: true,
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationState.pathname,
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(navigationState.search),
}));

vi.mock("@/lib/admin/client-auth", () => ({
  fetchAdminWithAuth: (...args: unknown[]) =>
    (mocks.fetchAdminWithAuth as (...inner: unknown[]) => unknown)(...args),
}));

vi.mock("@/lib/admin/useAdminGuard", () => ({
  useAdminGuard: () => mocks.guardState,
}));

vi.mock("@/components/admin/AdminGlobalHeader", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/admin/AdminBreadcrumbs", () => ({
  __esModule: true,
  default: () => <div data-testid="breadcrumbs" />,
}));

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("CastScreentimePageClient", () => {
  beforeEach(() => {
    vi.useRealTimers();
    mocks.fetchAdminWithAuth.mockReset();
    mocks.clipboardWriteText.mockReset();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: mocks.clipboardWriteText,
      },
    });
    navigationState.pathname = "/admin/cast-screentime";
    navigationState.search = "show_id=show-1";
    mocks.fetchAdminWithAuth.mockImplementation((input: unknown) => {
      const url = String(input);
      if (url.includes("/shows/show-1/runs")) {
        return Promise.resolve(
          jsonResponse({
            runs: [
              {
                id: "run-1",
                status: "success",
                review_status: "approved",
                run_type: "cast_screentime",
                video_asset_id: "asset-1",
                show_id: "show-1",
                season_id: "season-1",
                owner_scope: "season",
                media_type: "trailer",
                media_kind: null,
                video_class: "promo",
                promo_subtype: "trailer",
                publication_mode: "supplementary_reference",
              },
            ],
          }),
        );
      }
      if (url.endsWith("/runs/run-1")) {
        return Promise.resolve(
          jsonResponse({
            id: "run-1",
            status: "success",
            review_status: "approved",
            run_type: "cast_screentime",
            video_asset_id: "asset-1",
            show_id: "show-1",
            season_id: "season-1",
            owner_scope: "season",
            media_type: "trailer",
            media_kind: null,
            video_class: "promo",
            promo_subtype: "trailer",
            publication_mode: "supplementary_reference",
          }),
        );
      }
      if (url.endsWith("/runs/run-1/leaderboard")) {
        return Promise.resolve(
          jsonResponse({
            leaderboard: [
              {
                person_id: "person-1",
                display_name: "Person One",
                screen_time_seconds: 12.5,
                frame_count: 120,
                confidence_avg: 0.93,
              },
            ],
          }),
        );
      }
      if (url.endsWith("/runs/run-1/review-summary")) {
        return Promise.resolve(
          jsonResponse({
            run_id: "run-1",
            publication_mode: "supplementary_reference",
            is_canonical_publication: false,
            excluded_section_count: 1,
            excluded_overlap_ms: 2000,
            raw_leaderboard: [
              {
                person_id: "person-1",
                display_name: "Person One",
                screen_time_seconds: 12.5,
                frame_count: 120,
              },
            ],
            reviewed_leaderboard: [
              {
                person_id: "person-1",
                display_name: "Person One",
                screen_time_seconds: 6.0,
                frame_count: 120,
              },
            ],
            decision_counts: {
              suggestion_decisions: 0,
              unknown_review_state: 0,
            },
            rerun_required_for_identity_changes: false,
          }),
        );
      }
      if (url.endsWith("/runs/run-1/segments")) {
        return Promise.resolve(jsonResponse({ segments: [] }));
      }
      if (url.endsWith("/runs/run-1/evidence")) {
        return Promise.resolve(jsonResponse({ evidence: [] }));
      }
      if (url.endsWith("/runs/run-1/excluded-sections")) {
        return Promise.resolve(
          jsonResponse({
            excluded_sections: [
              {
                section_key: "cold-open",
                section_type: "intro",
                start_ms: 1000,
                end_ms: 3000,
                duration_ms: 2000,
                detection_source: "manual",
              },
            ],
          }),
        );
      }
      if (url.endsWith("/runs/run-1/decision-state")) {
        return Promise.resolve(
          jsonResponse({
            suggestion_decisions: [],
            unknown_review_state: [],
            rerun_required_for_metrics: false,
            decision_effect_summary: null,
          }),
        );
      }
      if (url.includes("/artifacts/")) {
        return Promise.resolve(jsonResponse({ error: "not found" }, 404));
      }
      if (url.includes("/video-assets/asset-1/publish-history")) {
        return Promise.resolve(jsonResponse({ publish_history: [] }));
      }
      if (url.includes("/shows/show-1/published-rollups")) {
        return Promise.resolve(jsonResponse({ published_asset_count: 0, leaderboard: [] }));
      }
      if (url.includes("/seasons/season-1/published-rollups")) {
        return Promise.resolve(jsonResponse({ published_asset_count: 0, leaderboard: [] }));
      }
      return Promise.resolve(jsonResponse({}));
    });
  });

  it("surfaces reviewed totals and internal-reference publish action for approved trailer runs", async () => {
    render(<CastScreentimePageClient />);

    fireEvent.click(screen.getByRole("button", { name: "Refresh Show Runs" }));

    const loadButton = await screen.findByRole("button", { name: "Load" });
    fireEvent.click(loadButton);

    await waitFor(() => {
      expect(screen.getByText("Reviewed Totals")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("heading", {
        name: "Supplementary reference publication",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish Internal Reference" })).toBeInTheDocument();
    expect(screen.getByText("6.000s")).toBeInTheDocument();
    expect(screen.queryByText(/"run_type": "cast_screentime"/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copy run link" }));

    await waitFor(() => {
      expect(mocks.clipboardWriteText).toHaveBeenCalledWith(
        "https://admin.trr.localhost/screenalytics/runs/run-1",
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Debug details" }));

    expect(await screen.findByText(/"run_type": "cast_screentime"/)).toBeInTheDocument();
  });

  it("prefills the canonical RHOBH test extra context from the screenalytics setup path", () => {
    navigationState.pathname = "/screenalytics/rhobh/s5/e16/extras/screenalytics-test";
    navigationState.search = "";

    render(<CastScreentimePageClient />);

    expect(screen.getByLabelText("Show")).toHaveValue("909ddc36-ca4d-4b09-8aa5-dd5dd34f987e");
    expect(screen.getByLabelText("Season")).toHaveValue("98ac397a-3928-4583-92bc-25ea84c42d89");
    expect(screen.getByLabelText("Episode")).toHaveValue("4eb4ceb4-c13d-4c29-bd0f-8bcde94b6591");
    expect(screen.getByLabelText("Asset Type")).toHaveValue("extras");
    expect(screen.getByLabelText("Content Type")).toHaveValue("screenalytics_test");
    expect(screen.queryByLabelText("Owner Scope")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Owner ID")).not.toBeInTheDocument();
  });

  it("polls a queued remote import until the promoted asset is available", async () => {
    let resolveStatus: ((response: Response) => void) | undefined;
    mocks.fetchAdminWithAuth.mockImplementation((input: unknown) => {
      const url = String(input);
      if (url.endsWith("/video-assets/import")) {
        return Promise.resolve(
          jsonResponse(
            {
              upload_session_id: "import-session-1",
              queued: true,
              status: "queued",
              video_asset: null,
            },
            202,
          ),
        );
      }
      if (url.endsWith("/upload-sessions/import-session-1")) {
        return new Promise<Response>((resolve) => {
          resolveStatus = resolve;
        });
      }
      if (url.includes("/shows/show-1/runs")) {
        return Promise.resolve(jsonResponse({ runs: [] }));
      }
      return Promise.resolve(jsonResponse({}));
    });

    render(<CastScreentimePageClient />);

    fireEvent.change(screen.getByLabelText("Season"), {
      target: { value: "98ac397a-3928-4583-92bc-25ea84c42d89" },
    });
    fireEvent.change(screen.getByLabelText("Source URL"), {
      target: { value: "https://cdn.example.com/trailer.mp4" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import Asset" }));

    expect(await screen.findAllByText("Import queued...")).toHaveLength(2);

    resolveStatus?.(
      jsonResponse({
        upload_session_id: "import-session-1",
        status: "promoted",
        promoted_video_asset_id: "asset-promoted-1",
        video_asset: {
          id: "asset-promoted-1",
          show_id: "show-1",
          season_id: "98ac397a-3928-4583-92bc-25ea84c42d89",
          owner_scope: "season",
          owner_id: "98ac397a-3928-4583-92bc-25ea84c42d89",
          media_type: "trailer",
          media_kind: null,
          video_class: "promo",
          promo_subtype: "trailer",
          source_import_type: "external_url_import",
          is_publishable: false,
        },
      }),
    );

    await waitFor(() => {
      expect(screen.getAllByText("external url import").length).toBeGreaterThan(0);
    });
    expect(screen.getByRole("button", { name: "Launch Run" })).toBeEnabled();
  });

  it("previews, searches, paginates, downloads, and safely renders extracted source subtitles", async () => {
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    mocks.fetchAdminWithAuth.mockImplementation((input: unknown) => {
      const url = String(input);
      if (url.endsWith("/video-assets/import")) {
        return Promise.resolve(
          jsonResponse({
            upload_session_id: "import-complete-1",
            status: "promoted",
            video_asset: {
              id: "asset-subtitles-1",
              show_id: "show-1",
              season_id: "season-1",
              owner_scope: "season",
              owner_id: "season-1",
              media_type: "trailer",
              source_import_type: "external_url_import",
            },
          }),
        );
      }
      if (url.endsWith("/video-assets/asset-subtitles-1/subtitles/extract")) {
        return Promise.resolve(jsonResponse({ status: "queued", force: true }, 202));
      }
      if (url.endsWith("/video-assets/asset-subtitles-1/subtitles")) {
        return Promise.resolve(
          jsonResponse({
            video_asset_id: "asset-subtitles-1",
            status: "complete",
            attempts: 1,
            discovered_track_count: 2,
            eligible_track_count: 1,
            completed_track_count: 1,
            failed_track_count: 0,
            primary_track_id: "track-2",
            tracks: [
              {
                id: "track-2",
                stream_index: 2,
                codec_name: "mov_text",
                language: "en",
                language_raw: "eng",
                is_default: true,
                is_forced: false,
                is_primary: true,
                selection_status: "eligible_english",
                extraction_status: "complete",
                cue_count: 75,
                first_cue_start_ms: 14448,
                last_cue_end_ms: 6308702,
                srt_size_bytes: 185615,
                srt_sha256: "2fdf46f4e83f69d66cc5d9f041233e8d",
              },
            ],
          }),
        );
      }
      if (url.includes("/subtitles/track-2/cues?")) {
        const requestUrl = new URL(url, "https://admin.trr.localhost");
        const offset = Number(requestUrl.searchParams.get("offset") || "0");
        const query = requestUrl.searchParams.get("q");
        return Promise.resolve(
          jsonResponse({
            video_asset_id: "asset-subtitles-1",
            track_id: "track-2",
            offset,
            limit: 50,
            total_cues: 75,
            matched_cues: query ? 1 : undefined,
            items: [
              {
                ordinal: offset + 1,
                start_ms: offset === 0 ? 14448 : 120000,
                end_ms: offset === 0 ? 16984 : 122000,
                text: query ? "<i><script>alert(1)</script> ALICE:</i> Hello" : "<i>ALICE:</i> Hello",
                plain_text: query ? "<script>alert(1)</script> ALICE: Hello" : "ALICE: Hello",
              },
            ],
          }),
        );
      }
      if (url.endsWith("/subtitles/track-2/download-url")) {
        return Promise.resolve(
          jsonResponse({
            filename: "Love Island.S08.E01.stream-2.en.srt",
            download_url: "https://r2.example.test/signed-caption",
          }),
        );
      }
      if (url.includes("/shows/show-1/runs")) return Promise.resolve(jsonResponse({ runs: [] }));
      return Promise.resolve(jsonResponse({}));
    });

    render(<CastScreentimePageClient />);
    fireEvent.change(screen.getByLabelText("Season"), {
      target: { value: "98ac397a-3928-4583-92bc-25ea84c42d89" },
    });
    fireEvent.change(screen.getByLabelText("Source URL"), {
      target: { value: "https://cdn.example.com/love-island.mp4" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import Asset" }));

    expect(await screen.findByText("Ready")).toBeInTheDocument();
    expect(screen.getByLabelText("English subtitle track")).toHaveValue("track-2");
    expect(await screen.findByText("ALICE: Hello")).toBeInTheDocument();
    expect(screen.getAllByText(/00:00:14\.448/).length).toBeGreaterThan(0);
    expect(screen.getByText("181.3 KiB · 2fdf46f4e8…")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next cues" }));
    await waitFor(() => {
      expect(mocks.fetchAdminWithAuth).toHaveBeenCalledWith(
        expect.stringContaining("offset=50&limit=50"),
        undefined,
        expect.objectContaining({ allowDevAdminBypass: true }),
      );
    });

    fireEvent.change(screen.getByLabelText("Search subtitle cues"), { target: { value: "ALICE" } });
    expect(await screen.findByText("<script>alert(1)</script> ALICE: Hello")).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
    await waitFor(() => {
      expect(mocks.fetchAdminWithAuth).toHaveBeenCalledWith(
        expect.stringContaining("q=ALICE"),
        undefined,
        expect.objectContaining({ allowDevAdminBypass: true }),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Download SRT" }));
    await waitFor(() => expect(anchorClick).toHaveBeenCalled());
    expect(mocks.fetchAdminWithAuth).toHaveBeenCalledWith(
      "/api/admin/trr-api/cast-screentime/video-assets/asset-subtitles-1/subtitles/track-2/download-url",
      undefined,
      expect.objectContaining({ allowDevAdminBypass: true }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Re-extract" }));
    await waitFor(() => {
      expect(confirm).toHaveBeenCalled();
      expect(mocks.fetchAdminWithAuth).toHaveBeenCalledWith(
        "/api/admin/trr-api/cast-screentime/video-assets/asset-subtitles-1/subtitles/extract",
        expect.objectContaining({ method: "POST", body: JSON.stringify({ force: true }) }),
        expect.objectContaining({ allowDevAdminBypass: true }),
      );
    });

    anchorClick.mockRestore();
    confirm.mockRestore();
  });

  it("queues first-time subtitle extraction without blocking the promoted video asset", async () => {
    let extractionQueued = false;
    mocks.fetchAdminWithAuth.mockImplementation((input: unknown, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/video-assets/import")) {
        return Promise.resolve(
          jsonResponse({
            upload_session_id: "import-no-subtitles-1",
            video_asset: {
              id: "asset-not-requested-1",
              show_id: "show-1",
              season_id: "season-1",
              owner_scope: "season",
              owner_id: "season-1",
              media_type: "trailer",
            },
          }),
        );
      }
      if (url.endsWith("/video-assets/asset-not-requested-1/subtitles/extract")) {
        extractionQueued = true;
        expect(JSON.parse(String(init?.body))).toEqual({ force: false });
        return Promise.resolve(jsonResponse({ status: "queued", already_active: false }, 202));
      }
      if (url.endsWith("/video-assets/asset-not-requested-1/subtitles")) {
        return Promise.resolve(
          jsonResponse({
            video_asset_id: "asset-not-requested-1",
            status: extractionQueued ? "queued" : "not_requested",
            tracks: [],
          }),
        );
      }
      if (url.includes("/shows/show-1/runs")) return Promise.resolve(jsonResponse({ runs: [] }));
      return Promise.resolve(jsonResponse({}));
    });

    render(<CastScreentimePageClient />);
    fireEvent.change(screen.getByLabelText("Season"), {
      target: { value: "98ac397a-3928-4583-92bc-25ea84c42d89" },
    });
    fireEvent.change(screen.getByLabelText("Source URL"), {
      target: { value: "https://cdn.example.com/no-subtitles-yet.mp4" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import Asset" }));

    const extractButton = await screen.findByRole("button", { name: "Extract Subtitles" });
    expect(screen.getByRole("button", { name: "Launch Run" })).toBeEnabled();
    fireEvent.click(extractButton);

    expect(await screen.findByText("Queued")).toBeInTheDocument();
    expect(await screen.findByText(/video remains available for analysis/i)).toBeInTheDocument();
  });

  it("shows a non-blocking subtitle failure with a retry action", async () => {
    mocks.fetchAdminWithAuth.mockImplementation((input: unknown) => {
      const url = String(input);
      if (url.endsWith("/video-assets/import")) {
        return Promise.resolve(
          jsonResponse({
            upload_session_id: "import-failed-subtitles-1",
            video_asset: {
              id: "asset-failed-subtitles-1",
              show_id: "show-1",
              season_id: "season-1",
              owner_scope: "season",
              owner_id: "season-1",
              media_type: "trailer",
            },
          }),
        );
      }
      if (url.endsWith("/video-assets/asset-failed-subtitles-1/subtitles")) {
        return Promise.resolve(
          jsonResponse({
            video_asset_id: "asset-failed-subtitles-1",
            status: "failed",
            error: "ffprobe could not inspect subtitle streams",
            attempts: 1,
            tracks: [],
          }),
        );
      }
      if (url.includes("/shows/show-1/runs")) return Promise.resolve(jsonResponse({ runs: [] }));
      return Promise.resolve(jsonResponse({ status: "queued" }, 202));
    });

    render(<CastScreentimePageClient />);
    fireEvent.change(screen.getByLabelText("Season"), {
      target: { value: "98ac397a-3928-4583-92bc-25ea84c42d89" },
    });
    fireEvent.change(screen.getByLabelText("Source URL"), {
      target: { value: "https://cdn.example.com/failed-subtitles.mp4" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Import Asset" }));

    expect(await screen.findByText("Extraction failed")).toBeInTheDocument();
    expect(screen.getByText("ffprobe could not inspect subtitle streams")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry Extraction" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Launch Run" })).toBeEnabled();
  });

  it("caps automatic subtitle polling and leaves manual refresh available", async () => {
    vi.useFakeTimers();
    let subtitlePollCount = 0;
    navigationState.pathname = "/screenalytics/runs/run-1";
    const defaultFetchImplementation = mocks.fetchAdminWithAuth.getMockImplementation();
    if (!defaultFetchImplementation) throw new Error("Expected default Screenalytics fetch mock");
    mocks.fetchAdminWithAuth.mockImplementation((input: unknown, ...args: unknown[]) => {
      const url = String(input);
      if (url.endsWith("/video-assets/asset-1/subtitles")) {
        subtitlePollCount += 1;
        return Promise.resolve(
          jsonResponse({
            video_asset_id: "asset-1",
            status: "running",
            tracks: [],
          }),
        );
      }
      return defaultFetchImplementation(input, ...args);
    });

    render(<CastScreentimePageClient />);

    await act(async () => {
      for (let flushAttempt = 0; flushAttempt < 10; flushAttempt += 1) {
        await Promise.resolve();
      }
    });
    for (let timerStep = 0; timerStep < 10 && subtitlePollCount < 6; timerStep += 1) {
      await act(async () => {
        await vi.advanceTimersToNextTimerAsync();
        await Promise.resolve();
      });
    }

    expect(subtitlePollCount).toBe(6);
    expect(
      screen.getByText(
        "Subtitle extraction is still running. Automatic refresh paused after 6 checks; use Refresh to check again.",
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    await act(async () => {
      await Promise.resolve();
    });
    expect(subtitlePollCount).toBe(7);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(subtitlePollCount).toBe(7);
  });
});
