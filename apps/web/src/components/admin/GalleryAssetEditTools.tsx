"use client";

import { useEffect, useMemo, useState } from "react";

import {
  THUMBNAIL_DEFAULTS,
  parseThumbnailCrop,
  type ThumbnailCrop,
} from "@/lib/thumbnail-crop";
import type { GalleryAssetCapabilities } from "@/lib/admin/gallery-asset-capabilities";
import type { SeasonAsset } from "@/lib/server/trr-api/trr-shows-repository";

const GALLERY_EDIT_REQUEST_TIMEOUT_MS = 120_000;

interface GalleryAssetEditToolsProps {
  asset: SeasonAsset;
  capabilities: GalleryAssetCapabilities;
  getAuthHeaders: () => Promise<Record<string, string>>;
  onAssetUpdated?: (patch: Partial<SeasonAsset>) => void;
  onReload?: () => Promise<void>;
}

const toCountString = (value: number | null | undefined): string =>
  typeof value === "number" && Number.isFinite(value) ? String(Math.max(0, Math.floor(value))) : "";

const parseCountInput = (value: string): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
};

const asFinite = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const asPeopleCountSource = (value: unknown): "auto" | "manual" | null =>
  value === "auto" || value === "manual" ? value : null;

const clampPercent = (value: number): number => Math.min(100, Math.max(0, value));
const clampZoom = (value: number): number => Math.min(4, Math.max(1, value));
const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === "AbortError";

const fetchWithTimeout = async (
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

const mergeMetadata = (
  original: SeasonAsset["metadata"],
  patch: Record<string, unknown>
): Record<string, unknown> => ({
  ...((original && typeof original === "object" ? original : {}) as Record<string, unknown>),
  ...patch,
});

export function GalleryAssetEditTools({
  asset,
  capabilities,
  getAuthHeaders,
  onAssetUpdated,
  onReload,
}: GalleryAssetEditToolsProps) {
  const [peopleCountInput, setPeopleCountInput] = useState(toCountString(asset.people_count));
  const [cropX, setCropX] = useState<number>(asset.thumbnail_focus_x ?? THUMBNAIL_DEFAULTS.x);
  const [cropY, setCropY] = useState<number>(asset.thumbnail_focus_y ?? THUMBNAIL_DEFAULTS.y);
  const [cropZoom, setCropZoom] = useState<number>(asset.thumbnail_zoom ?? THUMBNAIL_DEFAULTS.zoom);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setPeopleCountInput(toCountString(asset.people_count));
    setCropX(asset.thumbnail_focus_x ?? THUMBNAIL_DEFAULTS.x);
    setCropY(asset.thumbnail_focus_y ?? THUMBNAIL_DEFAULTS.y);
    setCropZoom(asset.thumbnail_zoom ?? THUMBNAIL_DEFAULTS.zoom);
    setError(null);
    setNotice(null);
    setBusyKey(null);
  }, [asset.id, asset.people_count, asset.thumbnail_focus_x, asset.thumbnail_focus_y, asset.thumbnail_zoom]);

  const processingBase = useMemo(() => {
    if (asset.origin_table === "media_assets") {
      const assetId = asset.media_asset_id ?? asset.id;
      return { type: "media", id: assetId };
    }
    if (asset.origin_table === "cast_photos") {
      return { type: "cast", id: asset.id };
    }
    return null;
  }, [asset.id, asset.media_asset_id, asset.origin_table]);

  const callJson = async (
    url: string,
    init?: RequestInit
  ): Promise<Record<string, unknown>> => {
    const headers = await getAuthHeaders();
    let response: Response;
    try {
      response = await fetchWithTimeout(
        url,
        {
          ...init,
          headers: {
            ...headers,
            "Content-Type": "application/json",
            ...(init?.headers ?? {}),
          },
        },
        GALLERY_EDIT_REQUEST_TIMEOUT_MS
      );
    } catch (error) {
      if (isAbortError(error)) {
        throw new Error(
          `Request timed out after ${Math.round(GALLERY_EDIT_REQUEST_TIMEOUT_MS / 1000)}s`
        );
      }
      throw error;
    }
    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (!response.ok) {
      const message =
        typeof payload.error === "string"
          ? payload.error
          : typeof payload.detail === "string"
            ? payload.detail
            : "Request failed";
      throw new Error(message);
    }
    return payload;
  };

  const withBusy = async (key: string, action: () => Promise<void>) => {
    if (busyKey) return;
    setBusyKey(key);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyKey(null);
    }
  };

  const persistPeopleCount = async (nextCount: number | null) => {
    if (!capabilities.canPersistCount) {
      throw new Error(capabilities.reasons.persistCount ?? "People count persistence is not available for this asset.");
    }

    if (asset.origin_table === "media_assets") {
      if (!asset.link_id) throw new Error("Missing link_id for media-link context update.");
      const payload = await callJson(`/api/admin/trr-api/media-links/${asset.link_id}/context`, {
        method: "PATCH",
        body: JSON.stringify({
          people_count: nextCount,
          people_count_source: nextCount === null ? null : "manual",
        }),
      });
      const peopleCount = asFinite(payload.people_count);
      const peopleCountSource =
        payload.people_count_source === "auto" || payload.people_count_source === "manual"
          ? payload.people_count_source
          : null;
      onAssetUpdated?.({
        people_count: peopleCount,
        people_count_source: peopleCountSource,
      });
      return;
    }

    if (asset.origin_table === "cast_photos") {
      const payload = await callJson(`/api/admin/trr-api/cast-photos/${asset.id}/people-count`, {
        method: "PATCH",
        body: JSON.stringify({ people_count: nextCount }),
      });
      const peopleCount = asFinite(payload.people_count);
      const peopleCountSource =
        payload.people_count_source === "auto" || payload.people_count_source === "manual"
          ? payload.people_count_source
          : null;
      onAssetUpdated?.({
        people_count: peopleCount,
        people_count_source: peopleCountSource,
      });
      return;
    }

    throw new Error("People count persistence is not supported for this asset origin.");
  };

  const handleSaveCount = async () => {
    await withBusy("save-count", async () => {
      const parsed = parseCountInput(peopleCountInput);
      await persistPeopleCount(parsed);
      setNotice("People count saved.");
    });
  };

  const runAutoCount = async (): Promise<{
    payload: Record<string, unknown>;
    peopleCount: number | null;
    peopleCountSource: "auto" | "manual" | null;
    thumbnailCrop: ThumbnailCrop | null;
  }> => {
    if (!capabilities.canRecount || !processingBase) {
      throw new Error(capabilities.reasons.recount ?? "Auto-count is not available for this asset.");
    }

    const endpoint =
      processingBase.type === "media"
        ? `/api/admin/trr-api/media-assets/${processingBase.id}/auto-count`
        : `/api/admin/trr-api/cast-photos/${processingBase.id}/auto-count`;
    const payload = await callJson(endpoint, {
      method: "POST",
      body: JSON.stringify({ force: true }),
    });
    const peopleCount = asFinite(payload.people_count);
    const peopleCountSource = asPeopleCountSource(payload.people_count_source);
    const thumbnailCrop = parseThumbnailCrop(payload.thumbnail_crop, { clamp: true });

    setPeopleCountInput(toCountString(peopleCount));
    onAssetUpdated?.({
      people_count: peopleCount,
      people_count_source: peopleCountSource,
      thumbnail_focus_x: thumbnailCrop?.x ?? null,
      thumbnail_focus_y: thumbnailCrop?.y ?? null,
      thumbnail_zoom: thumbnailCrop?.zoom ?? null,
      thumbnail_crop_mode: thumbnailCrop?.mode ?? null,
      metadata: mergeMetadata(asset.metadata, {
        has_text_overlay:
          typeof payload.has_text_overlay === "boolean"
            ? payload.has_text_overlay
            : (asset.metadata as Record<string, unknown> | null)?.has_text_overlay ?? null,
        thumbnail_crop: thumbnailCrop ?? null,
      }),
    });

    if (processingBase.type === "media" && asset.link_id && capabilities.canPersistCount) {
      await callJson(`/api/admin/trr-api/media-links/${asset.link_id}/context`, {
        method: "PATCH",
        body: JSON.stringify({
          people_count: peopleCount,
          people_count_source: peopleCountSource ?? "auto",
        }),
      });
    }

    return { payload, peopleCount, peopleCountSource, thumbnailCrop };
  };

  const handleRecount = async () => {
    await withBusy("recount", async () => {
      await runAutoCount();
      setNotice("Auto-count complete.");
    });
  };

  const handleTextId = async () => {
    await withBusy("text-id", async () => {
      if (!capabilities.canTextId || !processingBase) {
        throw new Error(capabilities.reasons.textId ?? "Text ID is not available for this asset.");
      }
      const endpoint =
        processingBase.type === "media"
          ? `/api/admin/trr-api/media-assets/${processingBase.id}/detect-text-overlay`
          : `/api/admin/trr-api/cast-photos/${processingBase.id}/detect-text-overlay`;
      const payload = await callJson(endpoint, {
        method: "POST",
        body: JSON.stringify({ force: true }),
      });
      const hasTextOverlay =
        typeof payload.has_text_overlay === "boolean"
          ? payload.has_text_overlay
          : typeof payload.hasTextOverlay === "boolean"
            ? payload.hasTextOverlay
            : null;
      onAssetUpdated?.({
        metadata: mergeMetadata(asset.metadata, {
          has_text_overlay: hasTextOverlay,
        }),
      });
      setNotice("Text overlay classification complete.");
    });
  };

  const persistCrop = async (crop: ThumbnailCrop | null) => {
    if (!capabilities.canPersistCrop) {
      throw new Error(capabilities.reasons.persistCrop ?? "Crop persistence is not available for this asset.");
    }

    if (asset.origin_table === "media_assets") {
      if (!asset.link_id) throw new Error("Missing link_id for media-link crop update.");
      const payload = await callJson(`/api/admin/trr-api/media-links/${asset.link_id}/context`, {
        method: "PATCH",
        body: JSON.stringify({
          thumbnail_crop: crop,
        }),
      });
      const savedCrop =
        payload.thumbnail_crop && typeof payload.thumbnail_crop === "object"
          ? (payload.thumbnail_crop as ThumbnailCrop)
          : null;
      onAssetUpdated?.({
        thumbnail_focus_x: savedCrop?.x ?? null,
        thumbnail_focus_y: savedCrop?.y ?? null,
        thumbnail_zoom: savedCrop?.zoom ?? null,
        thumbnail_crop_mode: savedCrop?.mode ?? null,
      });
      return;
    }

    if (asset.origin_table === "cast_photos") {
      if (!asset.person_id) throw new Error("Missing person_id for cast photo crop update.");
      const payload = await callJson(
        `/api/admin/trr-api/people/${asset.person_id}/photos/${asset.id}/thumbnail-crop`,
        {
          method: "PUT",
          body: JSON.stringify({
            origin: "cast_photos",
            crop,
          }),
        }
      );
      onAssetUpdated?.({
        thumbnail_focus_x: asFinite(payload.thumbnail_focus_x),
        thumbnail_focus_y: asFinite(payload.thumbnail_focus_y),
        thumbnail_zoom: asFinite(payload.thumbnail_zoom),
        thumbnail_crop_mode:
          payload.thumbnail_crop_mode === "manual" || payload.thumbnail_crop_mode === "auto"
            ? payload.thumbnail_crop_mode
            : null,
      });
      return;
    }

    throw new Error("Crop persistence is not supported for this asset origin.");
  };

  const handleSaveCrop = async () => {
    await withBusy("save-crop", async () => {
      const payload: ThumbnailCrop = {
        x: Number(clampPercent(cropX).toFixed(2)),
        y: Number(clampPercent(cropY).toFixed(2)),
        zoom: Number(clampZoom(cropZoom).toFixed(2)),
        mode: "manual",
      };
      await persistCrop(payload);
      setNotice("Crop saved.");
    });
  };

  const handleRefreshAutoCrop = async () => {
    await withBusy("auto-crop", async () => {
      await persistCrop(null);
      let activeCrop: ThumbnailCrop | null = null;
      if (capabilities.canRecount && processingBase) {
        const recount = await runAutoCount();
        activeCrop = recount.thumbnailCrop;
      }

      const endpoint =
        processingBase?.type === "media"
          ? processingBase
            ? `/api/admin/trr-api/media-assets/${processingBase.id}/variants`
            : null
          : processingBase
            ? `/api/admin/trr-api/cast-photos/${processingBase.id}/variants`
            : null;
      if (endpoint) {
        await callJson(endpoint, {
          method: "POST",
          body: JSON.stringify({ force: true }),
        });
        await callJson(endpoint, {
          method: "POST",
          body: JSON.stringify({
            force: true,
            crop: activeCrop ?? {
              x: THUMBNAIL_DEFAULTS.x,
              y: THUMBNAIL_DEFAULTS.y,
              zoom: THUMBNAIL_DEFAULTS.zoom,
              mode: "auto",
              strategy: "resize_center_fallback_v1",
            },
          }),
        });
      }

      setCropX(activeCrop?.x ?? THUMBNAIL_DEFAULTS.x);
      setCropY(activeCrop?.y ?? THUMBNAIL_DEFAULTS.y);
      setCropZoom(activeCrop?.zoom ?? THUMBNAIL_DEFAULTS.zoom);
      if (onReload) await onReload();
      setNotice("Auto-crop + centering refreshed.");
    });
  };

  const runVariants = async (mode: "base" | "crop") => {
    await withBusy(`variants-${mode}`, async () => {
      if (!capabilities.canResize || !processingBase) {
        throw new Error(capabilities.reasons.resize ?? "Variant generation is not available for this asset.");
      }

      const endpoint =
        processingBase.type === "media"
          ? `/api/admin/trr-api/media-assets/${processingBase.id}/variants`
          : `/api/admin/trr-api/cast-photos/${processingBase.id}/variants`;
      const body: Record<string, unknown> = { force: true };
      if (mode === "crop") {
        body.crop = {
          x: Number(clampPercent(cropX).toFixed(2)),
          y: Number(clampPercent(cropY).toFixed(2)),
          zoom: Number(clampZoom(cropZoom).toFixed(2)),
          mode: "manual",
        };
      }
      const payload = await callJson(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (payload.metadata && typeof payload.metadata === "object") {
        onAssetUpdated?.({
          metadata: payload.metadata as Record<string, unknown>,
        });
      }
      if (onReload) await onReload();
      setNotice(mode === "crop" ? "Crop variants generated." : "Base variants generated.");
    });
  };

  const countDisplay = asset.people_count ?? null;
  const countSource = asset.people_count_source ?? null;

  return (
    <div className="space-y-4 rounded border border-white/10 bg-white/[0.03] p-3">
      <div>
        <p className="text-[10px] uppercase tracking-widest text-white/55">People Count</p>
        <p className="mt-1 text-xs text-white/80">
          Current: {countDisplay ?? "—"}
          {countSource ? ` (${countSource})` : ""}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <input
            value={peopleCountInput}
            onChange={(event) => setPeopleCountInput(event.target.value)}
            placeholder="Count"
            disabled={busyKey !== null || !capabilities.canPersistCount}
            className="w-20 rounded border border-white/20 bg-black/40 px-2 py-1 text-xs text-white placeholder:text-white/40 disabled:opacity-60"
          />
          <button
            type="button"
            disabled={busyKey !== null || !capabilities.canPersistCount}
            onClick={handleSaveCount}
            title={!capabilities.canPersistCount ? capabilities.reasons.persistCount : undefined}
            className="rounded bg-white/10 px-2 py-1 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-60"
          >
            {busyKey === "save-count" ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            disabled={busyKey !== null || !capabilities.canRecount}
            onClick={handleRecount}
            title={!capabilities.canRecount ? capabilities.reasons.recount : undefined}
            className="rounded bg-white/10 px-2 py-1 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-60"
          >
            {busyKey === "recount" ? "Running..." : "Recount"}
          </button>
        </div>
        {!capabilities.canPersistCount && capabilities.reasons.persistCount && (
          <p className="mt-1 text-[11px] text-white/55">{capabilities.reasons.persistCount}</p>
        )}
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-widest text-white/55">Text ID</p>
        <button
          type="button"
          disabled={busyKey !== null || !capabilities.canTextId}
          onClick={handleTextId}
          title={!capabilities.canTextId ? capabilities.reasons.textId : undefined}
          className="mt-2 rounded bg-white/10 px-2 py-1 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-60"
        >
          {busyKey === "text-id" ? "Running..." : "Classify Text Overlay"}
        </button>
        {!capabilities.canTextId && capabilities.reasons.textId && (
          <p className="mt-1 text-[11px] text-white/55">{capabilities.reasons.textId}</p>
        )}
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-widest text-white/55">Crop / Resize</p>
        <div className="mt-2 space-y-2 text-xs text-white/80">
          <label className="block">
            X: {Math.round(cropX)}
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={cropX}
              disabled={busyKey !== null || !capabilities.canPersistCrop}
              onChange={(event) => setCropX(Number(event.target.value))}
              className="w-full"
            />
          </label>
          <label className="block">
            Y: {Math.round(cropY)}
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={cropY}
              disabled={busyKey !== null || !capabilities.canPersistCrop}
              onChange={(event) => setCropY(Number(event.target.value))}
              className="w-full"
            />
          </label>
          <label className="block">
            Zoom: {cropZoom.toFixed(2)}
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={cropZoom}
              disabled={busyKey !== null || !capabilities.canPersistCrop}
              onChange={(event) => setCropZoom(Number(event.target.value))}
              className="w-full"
            />
          </label>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busyKey !== null || !capabilities.canPersistCrop}
            onClick={handleSaveCrop}
            title={!capabilities.canPersistCrop ? capabilities.reasons.persistCrop : undefined}
            className="rounded bg-white/10 px-2 py-1 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-60"
          >
            {busyKey === "save-crop" ? "Saving..." : "Save Crop"}
          </button>
          <button
            type="button"
            disabled={busyKey !== null || !capabilities.canPersistCrop}
            onClick={handleRefreshAutoCrop}
            title={!capabilities.canPersistCrop ? capabilities.reasons.persistCrop : undefined}
            className="rounded bg-white/10 px-2 py-1 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-60"
          >
            {busyKey === "auto-crop" ? "Refreshing..." : "Refresh Auto Crop"}
          </button>
          <button
            type="button"
            disabled={busyKey !== null || !capabilities.canResize}
            onClick={() => runVariants("base")}
            title={!capabilities.canResize ? capabilities.reasons.resize : undefined}
            className="rounded bg-white/10 px-2 py-1 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-60"
          >
            {busyKey === "variants-base" ? "Generating..." : "Generate Variants (Base)"}
          </button>
          <button
            type="button"
            disabled={busyKey !== null || !capabilities.canResize}
            onClick={() => runVariants("crop")}
            title={!capabilities.canResize ? capabilities.reasons.resize : undefined}
            className="rounded bg-white/10 px-2 py-1 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-60"
          >
            {busyKey === "variants-crop" ? "Generating..." : "Generate Variants (Crop)"}
          </button>
        </div>
        {!capabilities.canPersistCrop && capabilities.reasons.persistCrop && (
          <p className="mt-1 text-[11px] text-white/55">{capabilities.reasons.persistCrop}</p>
        )}
      </div>

      {error && <p className="text-xs text-red-300">{error}</p>}
      {notice && <p className="text-xs text-emerald-300">{notice}</p>}
    </div>
  );
}

export default GalleryAssetEditTools;
