"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import ImageSourceModal, { type ImageSourceSelection } from "@/components/admin/color-lab/ImageSourceModal";
import PaletteExportPanel from "@/components/admin/color-lab/PaletteExportPanel";
import ShadeThemePanels from "@/components/admin/color-lab/ShadeThemePanels";
import { buildThemes } from "@/lib/admin/color-lab/theme-contrast";
import { buildPaletteFromImageData } from "@/lib/admin/color-lab/palette-extraction";
import { normalizeHexColor } from "@/lib/admin/color-lab/color-math";
import type { PaletteLibraryEntry, PaletteLibrarySourceType, PaletteSamplePoint } from "@/lib/admin/color-lab/types";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";

interface SeasonOption {
  season_number: number;
  name?: string | null;
}

interface ImagePaletteLabProps {
  title?: string;
  defaultShowId?: string;
  defaultSeasonNumber?: number | null;
  onApplyPalette?: (colors: string[]) => void;
}

const MIN_COLORS = 3;
const MAX_COLORS = 10;

function normalizeColors(input: string[]): string[] {
  return input
    .map((color) => normalizeHexColor(color))
    .filter((color): color is string => Boolean(color));
}

function toImageProxyUrl(url: string): string {
  return `/api/admin/colors/image-proxy?url=${encodeURIComponent(url)}`;
}

export default function ImagePaletteLab({
  title = "Image Palette Lab",
  defaultShowId,
  defaultSeasonNumber = null,
  onApplyPalette,
}: ImagePaletteLabProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const uploadObjectUrlRef = useRef<string | null>(null);

  const [imageSourceOpen, setImageSourceOpen] = useState(false);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageIdentity, setImageIdentity] = useState<string | null>(null);
  const [imageSourceType, setImageSourceType] = useState<PaletteLibrarySourceType>("upload");
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);

  const [showId, setShowId] = useState<string | null>(defaultShowId ?? null);
  const [seasonNumber, setSeasonNumber] = useState<number | null>(defaultSeasonNumber ?? null);

  const [seedStep, setSeedStep] = useState(0);
  const [seed, setSeed] = useState(0);
  const [paletteCount, setPaletteCount] = useState(5);
  const [colors, setColors] = useState<string[]>([]);
  const [markerPoints, setMarkerPoints] = useState<PaletteSamplePoint[]>([]);

  const [imageReady, setImageReady] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);

  const [paletteEntries, setPaletteEntries] = useState<PaletteLibraryEntry[]>([]);
  const [paletteEntriesLoading, setPaletteEntriesLoading] = useState(false);
  const [paletteEntriesError, setPaletteEntriesError] = useState<string | null>(null);

  const [seasonOptions, setSeasonOptions] = useState<SeasonOption[]>([]);
  const [seasonOptionsLoading, setSeasonOptionsLoading] = useState(false);

  const [saveName, setSaveName] = useState("");
  const [saveSeasonScope, setSaveSeasonScope] = useState<string>(defaultSeasonNumber ? String(defaultSeasonNumber) : "all");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const themeStatus = useMemo(() => {
    if (colors.length === 0) {
      return { passes: false, label: "No palette yet" };
    }
    const generated = buildThemes(colors, 4.5);
    const passes = generated.every((theme) => theme.passes);
    return {
      passes,
      label: passes ? "AA 4.5:1 pass" : "AA 4.5:1 check failed",
    };
  }, [colors]);

  useEffect(() => {
    setShowId(defaultShowId ?? null);
  }, [defaultShowId]);

  useEffect(() => {
    setSeasonNumber(defaultSeasonNumber ?? null);
    setSaveSeasonScope(defaultSeasonNumber ? String(defaultSeasonNumber) : "all");
  }, [defaultSeasonNumber]);

  const revokePreviousUploadUrl = useCallback((nextImageUrl: string | null) => {
    const previous = uploadObjectUrlRef.current;
    if (previous && previous !== nextImageUrl) {
      if (typeof URL.revokeObjectURL === "function") {
        URL.revokeObjectURL(previous);
      }
      uploadObjectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (uploadObjectUrlRef.current) {
        if (typeof URL.revokeObjectURL === "function") {
          URL.revokeObjectURL(uploadObjectUrlRef.current);
        }
        uploadObjectUrlRef.current = null;
      }
    };
  }, []);

  const runPaletteExtraction = useCallback(() => {
    if (!imageReady || !imageIdentity || !imageRef.current) {
      return;
    }

    const image = imageRef.current;
    if (!Number.isFinite(image.naturalWidth) || !Number.isFinite(image.naturalHeight)) {
      return;
    }

    const width = image.naturalWidth;
    const height = image.naturalHeight;
    if (width <= 0 || height <= 0) {
      return;
    }

    setExtracting(true);
    setExtractError(null);

    try {
      const maxDimension = 1200;
      const scale = Math.min(1, maxDimension / Math.max(width, height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.floor(width * scale));
      canvas.height = Math.max(1, Math.floor(height * scale));

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        throw new Error("Unable to read image data from canvas context.");
      }

      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const extracted = buildPaletteFromImageData({
        imageData,
        count: paletteCount,
        seedStep,
        imageIdentity,
      });

      const normalizedColors = normalizeColors(extracted.colors).slice(0, paletteCount);
      setSeed(extracted.seed);
      setMarkerPoints(extracted.points.slice(0, normalizedColors.length));
      setColors(normalizedColors);
      setSaveError(null);
      setSaveSuccess(null);
    } catch (error) {
      console.error("[color-lab] Failed to extract palette", error);
      setExtractError(error instanceof Error ? error.message : "Failed to extract colors from image.");
      setColors([]);
      setMarkerPoints([]);
    } finally {
      setExtracting(false);
    }
  }, [imageIdentity, imageReady, paletteCount, seedStep]);

  useEffect(() => {
    runPaletteExtraction();
  }, [runPaletteExtraction]);

  const loadPaletteEntries = useCallback(async () => {
    if (!showId) {
      setPaletteEntries([]);
      setPaletteEntriesError(null);
      return;
    }

    setPaletteEntriesLoading(true);
    setPaletteEntriesError(null);

    try {
      const query = new URLSearchParams({ trrShowId: showId });
      if (seasonNumber !== null) {
        query.set("seasonNumber", String(seasonNumber));
      }
      const response = await fetchAdminWithAuth(`/api/admin/shows/palette-library?${query.toString()}`);
      const payload = (await response.json().catch(() => ({}))) as { entries?: PaletteLibraryEntry[]; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load palette library.");
      }

      setPaletteEntries(payload.entries ?? []);
    } catch (error) {
      setPaletteEntries([]);
      setPaletteEntriesError(error instanceof Error ? error.message : "Failed to load palette library.");
    } finally {
      setPaletteEntriesLoading(false);
    }
  }, [seasonNumber, showId]);

  const loadSeasonOptions = useCallback(async () => {
    if (!showId) {
      setSeasonOptions([]);
      return;
    }

    setSeasonOptionsLoading(true);
    try {
      const response = await fetchAdminWithAuth(`/api/admin/trr-api/shows/${encodeURIComponent(showId)}/seasons?limit=100`);
      const payload = (await response.json().catch(() => ({}))) as {
        seasons?: Array<{ season_number: number; name?: string | null }>;
      };
      if (!response.ok) {
        setSeasonOptions([]);
        return;
      }

      const next = (payload.seasons ?? [])
        .filter((season) => Number.isFinite(season.season_number))
        .sort((a, b) => a.season_number - b.season_number);
      setSeasonOptions(next);
    } finally {
      setSeasonOptionsLoading(false);
    }
  }, [showId]);

  useEffect(() => {
    void loadPaletteEntries();
    void loadSeasonOptions();
  }, [loadPaletteEntries, loadSeasonOptions]);

  const handleImageSelection = useCallback(
    (selection: ImageSourceSelection) => {
      revokePreviousUploadUrl(selection.imageUrl);
      if (selection.sourceType === "upload" && selection.imageUrl.startsWith("blob:")) {
        uploadObjectUrlRef.current = selection.imageUrl;
      } else {
        uploadObjectUrlRef.current = null;
      }

      setImageUrl(selection.imageUrl);
      setImageIdentity(selection.imageIdentity);
      setImageSourceType(selection.sourceType);
      setSourceImageUrl(selection.sourceImageUrl);
      setShowId(selection.trrShowId ?? defaultShowId ?? null);
      setSeasonNumber(selection.seasonNumber ?? defaultSeasonNumber ?? null);
      setSaveSeasonScope(
        selection.seasonNumber !== null && selection.seasonNumber !== undefined
          ? String(selection.seasonNumber)
          : defaultSeasonNumber
            ? String(defaultSeasonNumber)
            : "all",
      );
      setSeedStep(0);
      setImageReady(false);
      setExtractError(null);
      setSaveSuccess(null);
    },
    [defaultSeasonNumber, defaultShowId, revokePreviousUploadUrl],
  );

  const incrementPaletteCount = useCallback(() => {
    setPaletteCount((prev) => Math.min(MAX_COLORS, prev + 1));
  }, []);

  const decrementPaletteCount = useCallback(() => {
    setPaletteCount((prev) => Math.max(MIN_COLORS, prev - 1));
  }, []);

  const applyPaletteEntry = useCallback((entry: PaletteLibraryEntry) => {
    const entryColors = normalizeColors(entry.colors).slice(0, MAX_COLORS);
    setPaletteCount(Math.min(MAX_COLORS, Math.max(MIN_COLORS, entryColors.length)));
    setColors(entryColors);
    setMarkerPoints(entry.marker_points.slice(0, entryColors.length));
    setSeed(entry.seed);
    setSeedStep(0);
    setShowId(entry.trr_show_id);
    setSeasonNumber(entry.season_number);
    setSaveSeasonScope(entry.season_number === null ? "all" : String(entry.season_number));

    if (entry.source_image_url) {
      setImageSourceType(entry.source_type);
      setSourceImageUrl(entry.source_image_url);
      setImageIdentity(`library-entry:${entry.id}:${entry.seed}`);
      setImageUrl(toImageProxyUrl(entry.source_image_url));
      setImageReady(false);
    }

    setSaveSuccess(`Loaded palette '${entry.name}'.`);
    setSaveError(null);
  }, []);

  const handleDeletePalette = useCallback(
    async (entryId: string) => {
      try {
        const response = await fetchAdminWithAuth(`/api/admin/shows/palette-library/${entryId}`, {
          method: "DELETE",
        });
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to delete palette.");
        }
        setPaletteEntries((prev) => prev.filter((entry) => entry.id !== entryId));
      } catch (error) {
        setPaletteEntriesError(error instanceof Error ? error.message : "Failed to delete palette.");
      }
    },
    [],
  );

  const savePaletteToLibrary = useCallback(async () => {
    setSaveError(null);
    setSaveSuccess(null);

    if (!showId) {
      setSaveError("Select a show before saving to library.");
      return;
    }

    const trimmedName = saveName.trim();
    if (!trimmedName) {
      setSaveError("Palette name is required.");
      return;
    }

    if (colors.length < MIN_COLORS || colors.length > MAX_COLORS) {
      setSaveError("Palette must include between 3 and 10 colors.");
      return;
    }

    if (!themeStatus.passes) {
      setSaveError("Theme contrast check must pass before saving.");
      return;
    }

    if (markerPoints.length !== colors.length) {
      setSaveError("Marker points and colors are out of sync. Re-run the palette extraction.");
      return;
    }

    const parsedSeasonScope = saveSeasonScope === "all" ? null : Number.parseInt(saveSeasonScope, 10);
    if (
      parsedSeasonScope !== null &&
      (!Number.isFinite(parsedSeasonScope) || parsedSeasonScope <= 0)
    ) {
      setSaveError("Season scope must be ALL or a valid season number.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetchAdminWithAuth("/api/admin/shows/palette-library", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trrShowId: showId,
          seasonNumber: parsedSeasonScope,
          name: trimmedName,
          colors,
          sourceType: imageSourceType,
          sourceImageUrl,
          seed,
          markerPoints,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        entry?: PaletteLibraryEntry;
        error?: string;
      };
      if (!response.ok || !payload.entry) {
        throw new Error(payload.error ?? "Failed to save palette.");
      }

      setPaletteEntries((prev) => {
        const deduped = prev.filter((entry) => entry.id !== payload.entry!.id);
        return [payload.entry!, ...deduped];
      });
      setSaveSuccess(`Saved '${trimmedName}' to palette library.`);
      setSaveName("");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save palette.");
    } finally {
      setSaving(false);
    }
  }, [
    colors,
    imageSourceType,
    markerPoints,
    saveName,
    saveSeasonScope,
    seed,
    showId,
    sourceImageUrl,
    themeStatus.passes,
  ]);

  const canOpenLab = Boolean(imageUrl);

  return (
    <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-zinc-400">Image Palette Lab</p>
          <h3 className="mt-1 text-lg font-bold text-zinc-900">{title}</h3>
          <p className="mt-1 text-sm text-zinc-600">
            Import image by upload, URL, or media library; then generate deterministic palettes, shades, and themes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setImageSourceOpen(true)}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          {imageUrl ? "Change Image" : "Select Image"}
        </button>
      </div>

      <ImageSourceModal
        open={imageSourceOpen}
        onClose={() => setImageSourceOpen(false)}
        onSelect={handleImageSelection}
        defaultShowId={showId ?? defaultShowId}
        defaultSeasonNumber={seasonNumber ?? defaultSeasonNumber}
      />

      <div className="grid gap-4 lg:grid-cols-[24rem,minmax(0,1fr)]">
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <div>
            <p className="text-sm font-semibold text-zinc-900">Picked palettes</p>
            <input
              type="range"
              min={0}
              max={40}
              step={1}
              value={seedStep}
              onChange={(event) => setSeedStep(Number.parseInt(event.target.value, 10))}
              className="mt-2 w-full"
              disabled={!canOpenLab}
              aria-label="Palette randomization slider"
            />
            <p className="mt-1 text-xs text-zinc-500">Step {seedStep} | Seed {seed}</p>
          </div>

          <div>
            <p className="text-sm font-semibold text-zinc-900">Palette</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex min-h-12 flex-1 overflow-hidden rounded-xl border border-zinc-200">
                {colors.length === 0 ? (
                  <div className="flex w-full items-center justify-center bg-white text-xs text-zinc-500">
                    {canOpenLab ? "Sampling colors..." : "Select an image"}
                  </div>
                ) : (
                  colors.map((color, index) => (
                    <div
                      key={`${color}-${index}`}
                      className="relative flex-1"
                      style={{ backgroundColor: color }}
                      title={`${color} (marker ${index + 1})`}
                    >
                      <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-white/80" />
                    </div>
                  ))
                )}
              </div>
              <div className="flex flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white">
                <button
                  type="button"
                  onClick={incrementPaletteCount}
                  disabled={paletteCount >= MAX_COLORS}
                  className="px-3 py-1.5 text-lg leading-none text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
                  aria-label="Increase palette count"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={decrementPaletteCount}
                  disabled={paletteCount <= MIN_COLORS}
                  className="border-t border-zinc-200 px-3 py-1.5 text-lg leading-none text-zinc-700 hover:bg-zinc-100 disabled:opacity-40"
                  aria-label="Decrease palette count"
                >
                  -
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-zinc-500">{paletteCount} colors (range 3-10)</p>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Theme Check</p>
            <p className={`mt-1 text-sm font-semibold ${themeStatus.passes ? "text-emerald-700" : "text-red-700"}`}>
              {themeStatus.label}
            </p>
            {onApplyPalette && colors.length > 0 && (
              <button
                type="button"
                onClick={() => onApplyPalette(colors)}
                className="mt-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Apply Palette to Brand Fields
              </button>
            )}
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Save to Library</p>
            <div className="mt-2 grid gap-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Name</label>
              <input
                type="text"
                value={saveName}
                onChange={(event) => {
                  setSaveName(event.target.value);
                  setSaveError(null);
                }}
                placeholder="e.g. Canyon Twilight"
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
              />

              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Season Scope</label>
              <select
                value={saveSeasonScope}
                onChange={(event) => setSaveSeasonScope(event.target.value)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
                disabled={!showId || seasonOptionsLoading}
              >
                <option value="all">ALL</option>
                {seasonOptions.map((season) => (
                  <option key={season.season_number} value={season.season_number}>
                    Season {season.season_number}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => void savePaletteToLibrary()}
                disabled={saving || !showId || colors.length < MIN_COLORS}
                className="mt-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save to Library"}
              </button>
            </div>

            {!showId && (
              <p className="mt-2 text-xs text-zinc-500">Pick a show in image source selection before saving.</p>
            )}
            {saveError && <p className="mt-2 text-xs font-semibold text-red-600">{saveError}</p>}
            {saveSuccess && <p className="mt-2 text-xs font-semibold text-emerald-700">{saveSuccess}</p>}
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          {!imageUrl ? (
            <div className="flex h-[22rem] items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white text-sm text-zinc-500">
              Select an image source to generate a palette.
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-lg border border-zinc-200 bg-black/70">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Palette sampling source"
                crossOrigin="anonymous"
                onLoad={() => setImageReady(true)}
                onError={() => {
                  setImageReady(false);
                  setExtractError("Failed to load selected image.");
                }}
                className="max-h-[36rem] w-full object-contain"
              />

              {markerPoints.map((point, index) => (
                <span
                  key={`${index}-${point.x}-${point.y}`}
                  className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
                  style={{
                    left: `${Math.round(point.x * 10000) / 100}%`,
                    top: `${Math.round(point.y * 10000) / 100}%`,
                    width: index === 0 ? "3.2rem" : "1.6rem",
                    height: index === 0 ? "3.2rem" : "1.6rem",
                    backgroundColor: index === 0 ? `${colors[index] ?? "#000000"}88` : "transparent",
                  }}
                />
              ))}
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            {extracting && <span>Extracting colors...</span>}
            {!extracting && imageSourceType && <span>Source: {imageSourceType}</span>}
            {showId && <span>Show: {showId}</span>}
            {seasonNumber !== null && <span>Season: {seasonNumber}</span>}
          </div>
          {extractError && <p className="mt-2 text-xs font-semibold text-red-600">{extractError}</p>}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr),23rem]">
        <ShadeThemePanels colors={colors} />
        <PaletteExportPanel colors={colors} />
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">Saved Palettes</p>
            <p className="text-sm text-zinc-600">Show + season scoped palette library entries.</p>
          </div>
          <button
            type="button"
            onClick={() => void loadPaletteEntries()}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Refresh
          </button>
        </div>

        {paletteEntriesError && (
          <p className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            {paletteEntriesError}
          </p>
        )}

        {paletteEntriesLoading ? (
          <p className="text-sm text-zinc-500">Loading palette library...</p>
        ) : paletteEntries.length === 0 ? (
          <p className="text-sm text-zinc-500">No saved palettes for this show context yet.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {paletteEntries.map((entry) => (
              <article key={entry.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{entry.name}</p>
                    <p className="text-xs text-zinc-500">
                      {entry.season_number === null ? "ALL" : `Season ${entry.season_number}`} | {entry.source_type}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeletePalette(entry.id)}
                    className="rounded border border-red-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => applyPaletteEntry(entry)}
                  className="mt-2 block w-full rounded-lg border border-zinc-200 bg-white p-2 text-left hover:bg-zinc-50"
                >
                  <div className="flex overflow-hidden rounded-md border border-zinc-200">
                    {entry.colors.map((color, index) => (
                      <span
                        key={`${entry.id}-${color}-${index}`}
                        style={{ backgroundColor: color }}
                        className="h-6 flex-1"
                        title={color}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-500">Click to load palette + markers</p>
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
