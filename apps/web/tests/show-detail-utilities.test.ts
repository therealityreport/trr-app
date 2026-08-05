import { afterEach, describe, expect, it, vi } from "vitest";

import {
  GalleryAssetSourceError,
  type GalleryAssetSourceRequest,
} from "@/lib/admin/show-page/workspace-model";
import {
  areNumberArraysEqual,
  areStringArraysEqual,
  buildAssetAutoCropPayload,
  buildAssetAutoCropPayloadWithFallback,
  buildProgressMessage,
  extractBravoSocialHandle,
  formatBravoSocialLabel,
  formatFixed1,
  formatGallerySourceFailure,
  formatIsoAgeLabel,
  formatSnapshotAgeLabel,
  getFeaturedShowImageKind,
  inferBravoImportImageKind,
  inferBravoPersonUrl,
  inferBravoShowUrl,
  isAbortError,
  isBravoNetworkName,
  isCastRefreshPhaseId,
  isHttpUrlValue,
  isRetryableGalleryStatus,
  looksLikeUuid,
  normalizeBravoSocialKey,
  normalizeGallerySourceFailure,
  normalizeRefreshLogMessage,
  parseGalleryAssetErrorPayload,
  parseProgressNumber,
  resolveStageLabel,
  toFiniteNumber,
  withSnapshotAgeSuffix,
} from "@/lib/admin/show-page/show-detail-utilities";
import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";

const GALLERY_SOURCE: GalleryAssetSourceRequest = {
  id: "show",
  label: "Show images",
  baseUrl: "/api/admin/show-images",
};

const buildAsset = (overrides: Partial<SeasonAsset> = {}): SeasonAsset =>
  ({
    id: "asset-1",
    type: "show",
    source: "tmdb",
    kind: "poster",
    hosted_url: "https://cdn.example.com/asset-1.jpg",
    width: null,
    height: null,
    caption: null,
    ...overrides,
  }) as SeasonAsset;

afterEach(() => {
  vi.useRealTimers();
});

describe("show detail utilities", () => {
  it("preserves numeric parsing differences used by progress and display values", () => {
    expect(parseProgressNumber(2.75)).toBe(2.75);
    expect(parseProgressNumber(" 12.9 items")).toBe(12);
    expect(parseProgressNumber(" ")).toBeNull();
    expect(parseProgressNumber(Number.POSITIVE_INFINITY)).toBeNull();

    expect(toFiniteNumber(" 12.9 ")).toBe(12.9);
    expect(toFiniteNumber("12 items")).toBeNull();
    expect(formatFixed1("12.94")).toBe("12.9");
  });

  it("keeps gallery error precedence and explicit retryability", async () => {
    const response = new Response(
      JSON.stringify({
        detail: {
          message: " upstream unavailable ",
          code: "UPSTREAM_TIMEOUT",
          reason: "provider_timeout",
          retryable: false,
        },
      }),
      {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "content-type": "application/json" },
      }
    );

    await expect(parseGalleryAssetErrorPayload(response)).resolves.toEqual({
      message: "upstream unavailable",
      code: "UPSTREAM_TIMEOUT",
      reason: "provider_timeout",
      retryable: false,
      detail: {
        message: " upstream unavailable ",
        code: "UPSTREAM_TIMEOUT",
        reason: "provider_timeout",
        retryable: false,
      },
    });

    await expect(
      parseGalleryAssetErrorPayload(
        new Response("not json", { status: 425, statusText: "Too Early" })
      )
    ).resolves.toEqual({
      message: "425 Too Early",
      retryable: true,
    });
  });

  it("normalizes typed and unknown gallery source failures without losing metadata", () => {
    const typedFailure = normalizeGallerySourceFailure(
      GALLERY_SOURCE,
      new GalleryAssetSourceError({
        message: "Timed out",
        status: 504,
        retryable: true,
        code: "TIMEOUT",
        reason: "upstream",
        detail: { attempt: 2 },
      })
    );

    expect(typedFailure).toEqual({
      sourceId: "show",
      label: "Show images",
      message: "Timed out",
      status: 504,
      retryable: true,
      code: "TIMEOUT",
      reason: "upstream",
      detail: { attempt: 2 },
    });
    expect(formatGallerySourceFailure(typedFailure)).toBe(
      "Show images: Timed out (TIMEOUT), retryable"
    );
    expect(normalizeGallerySourceFailure(GALLERY_SOURCE, "unknown")).toEqual({
      sourceId: "show",
      label: "Show images",
      message: "Failed to load gallery assets",
      status: 500,
      retryable: false,
    });
  });

  it("classifies aborts and retryable statuses exactly", () => {
    const abort = new Error("cancelled");
    abort.name = "AbortError";

    expect(isAbortError(abort)).toBe(true);
    expect(isAbortError({ name: "AbortError" })).toBe(false);
    expect([408, 409, 425, 429, 500].every(isRetryableGalleryStatus)).toBe(true);
    expect(isRetryableGalleryStatus(499)).toBe(false);
  });

  it("formats ISO and snapshot ages at their boundary values", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-16T12:00:00.000Z"));

    expect(formatIsoAgeLabel("2026-07-16T11:59:58.600Z")).toBe("1s ago");
    expect(formatIsoAgeLabel("not-a-date")).toBeNull();
    expect(formatSnapshotAgeLabel(Date.now() - 59_999)).toBe("just now");
    expect(formatSnapshotAgeLabel(Date.now() - 60 * 60_000)).toBe("1h ago");
    expect(formatSnapshotAgeLabel(Date.now() + 60_000)).toBe("just now");
    expect(withSnapshotAgeSuffix("Using cached data.", Date.now() - 2 * 60_000)).toBe(
      "Using cached data. Last successful snapshot: 2m ago."
    );
    expect(withSnapshotAgeSuffix(null, Date.now())).toBeNull();
  });

  it("normalizes Bravo URLs, social labels, handles, networks, and image kinds", () => {
    expect(inferBravoShowUrl(" Watch What Happens & Live! ")).toBe(
      "https://www.bravotv.com/watch-what-happens-and-live"
    );
    expect(inferBravoPersonUrl(" Andy Cohen ")).toBe(
      "https://www.bravotv.com/people/andy-cohen"
    );
    expect(inferBravoPersonUrl("---")).toBeNull();
    expect(isBravoNetworkName("Bravo TV (US)")).toBe(true);
    expect(isBravoNetworkName("NBC")).toBe(false);
    expect(normalizeBravoSocialKey("Twitter / X")).toBe("x");
    expect(normalizeBravoSocialKey(" ")).toBe("link");
    expect(formatBravoSocialLabel("fan_club")).toBe("Fan Club");
    expect(extractBravoSocialHandle("https://instagram.com/andy/?hl=en")).toBe("@andy");
    expect(
      inferBravoImportImageKind({ url: "/images/key-art.jpg", alt: "Key art" })
    ).toBe("poster");
    expect(inferBravoImportImageKind({ url: "/images/unknown.jpg", alt: "Cast photo" })).toBe(
      "cast"
    );
  });

  it("normalizes stage and refresh-log messages without changing fallbacks", () => {
    expect(resolveStageLabel("sync_cast_photos", { sync_cast_photos: "Cast Media" })).toBe(
      "Cast Media"
    );
    expect(resolveStageLabel("custom_stage-name", {})).toBe("Custom Stage Name");
    expect(resolveStageLabel(3, {})).toBeNull();
    expect(buildProgressMessage("Cast Media", "  Fetching  ", "Working...")).toBe(
      "Cast Media: Fetching"
    );
    expect(buildProgressMessage("Cast Media", "", "Working...")).toBe(
      "Working on Cast Media..."
    );
    expect(
      normalizeRefreshLogMessage(
        "  Synced  4c0f0df0-7e69-4d39-8d22-11011752d30f   successfully  "
      )
    ).toBe("Synced person successfully");
  });

  it("preserves featured-kind and crop precedence with clamping and fallback", () => {
    expect(getFeaturedShowImageKind(buildAsset({ kind: " BACKDROP " }))).toBe("backdrop");
    expect(getFeaturedShowImageKind(buildAsset({ kind: "logo" }))).toBeNull();

    expect(
      buildAssetAutoCropPayload(
        buildAsset({
          thumbnail_focus_x: 120,
          thumbnail_focus_y: -5,
          thumbnail_zoom: 10,
          thumbnail_crop_mode: "manual",
          metadata: {
            thumbnail_crop: { x: 20, y: 30, zoom: 1.5, mode: "auto" },
          },
        })
      )
    ).toEqual({ x: 100, y: 0, zoom: 4, mode: "manual" });
    expect(
      buildAssetAutoCropPayload(
        buildAsset({
          metadata: {
            thumbnail_crop: { x: 20, y: 30, zoom: 1.5, mode: "auto" },
          },
        })
      )
    ).toEqual({ x: 20, y: 30, zoom: 1.5, mode: "auto" });
    expect(buildAssetAutoCropPayloadWithFallback(buildAsset())).toEqual({
      x: 50,
      y: 32,
      zoom: 1,
      mode: "auto",
      strategy: "resize_center_fallback_v1",
    });
  });

  it("keeps array equality order-sensitive and validates stable identifiers", () => {
    const strings = ["one", "two"];
    expect(areStringArraysEqual(strings, strings)).toBe(true);
    expect(areStringArraysEqual(strings, ["one", "two"])).toBe(true);
    expect(areStringArraysEqual(strings, ["two", "one"])).toBe(false);
    expect(areNumberArraysEqual([1, 2], [1, 2])).toBe(true);
    expect(areNumberArraysEqual([Number.NaN], [Number.NaN])).toBe(false);

    expect(looksLikeUuid("4c0f0df0-7e69-4d39-8d22-11011752d30f")).toBe(true);
    expect(looksLikeUuid("prefix-4c0f0df0-7e69-4d39-8d22-11011752d30f")).toBe(false);
    expect(isCastRefreshPhaseId("network_augmentation")).toBe(true);
    expect(isCastRefreshPhaseId("unknown")).toBe(false);
    expect(isHttpUrlValue("https://example.com/path")).toBe(true);
    expect(isHttpUrlValue("mailto:test@example.com")).toBe(false);
  });
});
