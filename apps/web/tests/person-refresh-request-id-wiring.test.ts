import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("person refresh request-id diagnostics wiring", () => {
  const pagePath = path.resolve(
    __dirname,
    "../src/app/admin/trr-shows/people/[personId]/PersonPageClient.tsx"
  );
  const pageContents = fs.readFileSync(pagePath, "utf8");

  it("generates per-click request ids with show+person context and monotonic counter", () => {
    expect(pageContents).toMatch(/personRefreshRequestCounterRef = useRef\(0\)/);
    expect(pageContents).toMatch(/const buildPersonRefreshRequestId = useCallback\(/);
    expect(pageContents).toMatch(/person-refresh-\$\{showToken\}-p\$\{personToken\}-\$\{timestampToken\}-\$\{counter\}/);
  });

  it("attaches x-trr-request-id header to refresh and reprocess stream requests", () => {
    expect(pageContents).toContain("/api/admin/trr-api/people/${personId}/refresh-images/stream");
    expect(pageContents).toContain("/api/admin/trr-api/people/${personId}/reprocess-images/stream");
    expect(pageContents).toMatch(/"x-trr-request-id": requestId/);
  });

  it("wires filtered-scope payload fields for stage runs", () => {
    expect(pageContents).toContain("target_cast_photo_ids");
    expect(pageContents).toContain("target_media_link_ids");
    expect(pageContents).toContain("scopedStageTargets.sources.length > 0");
    expect(pageContents).toContain("getImagesSourceSelection");
    expect(pageContents).toContain("No filtered images to reprocess${effectiveGalleryImportSuffix}.");
    expect(pageContents).toContain("No filtered images to sync${effectiveGalleryImportSuffix}.");
  });

  it("uses effective gallery import context for refresh and reprocess stream payloads", () => {
    expect(pageContents).toContain("resolvePersonGalleryImportContext");
    expect(pageContents).toContain("show_id: effectiveGalleryImportContext.showId ?? undefined");
    expect(pageContents).toContain("show_name: effectiveGalleryImportContext.showName ?? undefined");
    expect(pageContents).toContain("show_name: effectiveGalleryImportContext.showName || undefined");
    expect(pageContents).not.toContain("Import target:");
  });

  it("defaults person gallery scope to all instead of route-show-only imports", () => {
    expect(pageContents).toContain('const [galleryShowFilter, setGalleryShowFilter] = useState<GalleryShowFilter>("all")');
  });

  it("keeps Get Images ingestion-focused and leaves full reprocessing to Refresh Details", () => {
    expect(pageContents).toContain('const pipelineMode: PersonRefreshPipelineMode = "ingest"');
    expect(pageContents).toContain(
      'type GetImagesSourceSelection = "all" | "getty" | "getty_nbcumv" | "imdb" | "tmdb"'
    );
    expect(pageContents).toContain("const perSourceLimit =");
    expect(pageContents).toContain("limit_per_source: perSourceLimit");
    expect(pageContents).toContain("const [getImagesSourceSelection, setGetImagesSourceSelection] =");
    expect(pageContents).toContain("GET_IMAGES_SOURCE_OPTIONS");
    expect(pageContents).toContain("GET_IMAGES_SOURCE_SELECTION_MAP");
    expect(pageContents).toContain('all: ["nbcumv", "imdb", "tmdb"]');
    expect(pageContents).toContain('getty: ["getty"]');
    expect(pageContents).toContain('getty_nbcumv: ["nbcumv"]');
    expect(pageContents).toContain("getImagesSourcesForSelection(getImagesSourceSelection)");
    expect(pageContents).toContain("skip_auto_count: true");
    expect(pageContents).toContain("skip_word_detection: true");
    expect(pageContents).toContain("skip_centering: true");
    expect(pageContents).toContain("skip_resize: true");
    expect(pageContents).toContain("skip_prune: true");
    expect(pageContents).toContain("Runs Getty-only discovery/import and skips NBCUMV-only supplementing.");
    expect(pageContents).toContain("Runs the fused Getty / NBCUMV path.");
    expect(pageContents).toContain("Runs Getty, IMDb, and TMDb.");
    expect(pageContents).toContain("Get Images source selection: ${getImagesSelectionLabel(getImagesSourceSelection)}.");
    expect(pageContents).toContain("Connecting to backend stream for source sync and mirroring");
    expect(pageContents).toContain("source sync + mirror only");
    expect(pageContents).toContain('Run Get Images for ${effectiveGalleryImportLabel}');
  });

  it("records Getty local prefetch metadata before sending the refresh request", () => {
    expect(pageContents).toContain("prefetchGettyLocallyForPerson(");
    expect(pageContents).toContain("effectiveGalleryImportContext.showName ?? undefined");
    expect(pageContents).toContain("getty_prefetch_attempted: true");
    expect(pageContents).toContain("getty_prefetch_succeeded: false");
    expect(pageContents).toContain("Object.assign(refreshBody, gettyPrefetch.bodyPatch)");
    expect(pageContents).toContain("gettyPrefetch.candidateManifestTotal");
    expect(pageContents).toContain("gettyPrefetch.querySummaries.length");
    expect(pageContents).toContain("gettyErr instanceof GettyLocalPrefetchError ? gettyErr.code : \"UNREACHABLE\"");
    expect(pageContents).toContain("Getty/NBCUMV refresh requires local Getty prefetch because Modal is blocked by Getty.");
    expect(pageContents).toContain("Getty/NBCUMV refresh was not started.");
  });

  it("refreshes the gallery once per active operation state instead of polling full-gallery pages", () => {
    expect(pageContents).toContain("const PERSON_GALLERY_INITIAL_PAGE_SIZE = 48;");
    expect(pageContents).toContain('effectiveOperationStatus !== "running" && effectiveOperationStatus !== "queued"');
    expect(pageContents).toMatch(
      /void fetchPhotos\(\{\s*signal: controller\.signal,\s*includeBroken: showBrokenRows,\s*includeTotalCount: false,\s*requestRole: "secondary",/
    );
    expect(pageContents).not.toContain("window.setInterval(pollPhotos");
    expect(pageContents).toContain("Load More From Server");
  });

  it("treats duplicate operation event sequence failures as non-retryable", () => {
    expect(pageContents).toContain("admin_operation_events_op_seq_unique|duplicate key value violates unique constraint");
  });

  it("renders refresh logs with request-id prefix", () => {
    expect(pageContents).toMatch(/\[req:\$\{entry\.runId\}\] \$\{entry\.message\}/);
    expect(pageContents).toMatch(/runId: requestId/);
  });
});
