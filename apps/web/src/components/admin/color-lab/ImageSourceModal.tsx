"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";

import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import type { PaletteLibrarySourceType } from "@/lib/admin/color-lab/types";

type SourceTab = "upload" | "url" | "library";

interface TrrShowOption {
  id: string;
  name: string;
}

interface TrrSeasonOption {
  season_number: number;
  name?: string | null;
}

interface LibraryAsset {
  id: string;
  kind: string;
  hosted_url: string;
  caption?: string | null;
  source?: string | null;
}

export interface ImageSourceSelection {
  imageUrl: string;
  imageIdentity: string;
  sourceType: PaletteLibrarySourceType;
  sourceImageUrl: string | null;
  trrShowId: string | null;
  seasonNumber: number | null;
}

interface ImageSourceModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (selection: ImageSourceSelection) => void;
  defaultShowId?: string;
  defaultSeasonNumber?: number | null;
}

const normalizeKind = (kind: string | null | undefined): string => (kind ?? "").trim().toLowerCase();

function toProxyUrl(url: string): string {
  return `/api/admin/colors/image-proxy?url=${encodeURIComponent(url)}`;
}

export default function ImageSourceModal({
  open,
  onClose,
  onSelect,
  defaultShowId,
  defaultSeasonNumber = null,
}: ImageSourceModalProps) {
  const [activeTab, setActiveTab] = useState<SourceTab>("upload");
  const [uploadDragActive, setUploadDragActive] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [urlError, setUrlError] = useState<string | null>(null);

  const [showQuery, setShowQuery] = useState("");
  const [showOptions, setShowOptions] = useState<TrrShowOption[]>([]);
  const [showSearchLoading, setShowSearchLoading] = useState(false);
  const [selectedShowId, setSelectedShowId] = useState<string | null>(defaultShowId ?? null);
  const [seasons, setSeasons] = useState<TrrSeasonOption[]>([]);
  const [seasonsLoading, setSeasonsLoading] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(defaultSeasonNumber ?? null);

  const [libraryAssets, setLibraryAssets] = useState<LibraryAsset[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelectedShowId(defaultShowId ?? null);
    setSelectedSeason(defaultSeasonNumber ?? null);
  }, [defaultSeasonNumber, defaultShowId, open]);

  const searchShows = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setShowOptions([]);
      return;
    }

    setShowSearchLoading(true);
    try {
      const response = await fetchAdminWithAuth(`/api/admin/trr-api/shows?q=${encodeURIComponent(trimmed)}&limit=12`);
      const payload = (await response.json().catch(() => ({}))) as {
        shows?: Array<{ id: string; name: string }>;
      };
      if (!response.ok) {
        setShowOptions([]);
        return;
      }
      setShowOptions((payload.shows ?? []).map((show) => ({ id: show.id, name: show.name })));
    } finally {
      setShowSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      void searchShows(showQuery);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [open, searchShows, showQuery]);

  const loadSeasons = useCallback(async (showId: string) => {
    setSeasonsLoading(true);
    try {
      const response = await fetchAdminWithAuth(`/api/admin/trr-api/shows/${encodeURIComponent(showId)}/seasons?limit=100`);
      const payload = (await response.json().catch(() => ({}))) as {
        seasons?: Array<{ season_number: number; name?: string | null }>;
      };
      if (!response.ok) {
        setSeasons([]);
        return;
      }

      const sorted = (payload.seasons ?? [])
        .filter((season) => Number.isFinite(season.season_number))
        .sort((a, b) => a.season_number - b.season_number)
        .map((season) => ({ season_number: season.season_number, name: season.name ?? null }));
      setSeasons(sorted);

      if (defaultSeasonNumber !== null && sorted.some((season) => season.season_number === defaultSeasonNumber)) {
        setSelectedSeason(defaultSeasonNumber);
      } else if (selectedSeason !== null && !sorted.some((season) => season.season_number === selectedSeason)) {
        setSelectedSeason(null);
      }
    } finally {
      setSeasonsLoading(false);
    }
  }, [defaultSeasonNumber, selectedSeason]);

  useEffect(() => {
    if (!open || !selectedShowId) {
      setSeasons([]);
      return;
    }
    void loadSeasons(selectedShowId);
  }, [loadSeasons, open, selectedShowId]);

  const loadLibraryAssets = useCallback(async () => {
    if (!selectedShowId) {
      setLibraryError("Select a show first.");
      return;
    }

    setLibraryLoading(true);
    setLibraryError(null);
    try {
      const [showResponse, seasonResponse] = await Promise.all([
        fetchAdminWithAuth(`/api/admin/trr-api/shows/${encodeURIComponent(selectedShowId)}/assets?full=1`),
        selectedSeason !== null
          ? fetchAdminWithAuth(
              `/api/admin/trr-api/shows/${encodeURIComponent(selectedShowId)}/seasons/${encodeURIComponent(
                String(selectedSeason),
              )}/assets?full=1`,
            )
          : Promise.resolve(null),
      ]);

      const showPayload = (await showResponse.json().catch(() => ({}))) as { assets?: LibraryAsset[]; error?: string };
      if (!showResponse.ok) {
        throw new Error(showPayload.error ?? "Failed to load show media.");
      }

      let seasonAssets: LibraryAsset[] = [];
      if (seasonResponse) {
        const seasonPayload = (await seasonResponse.json().catch(() => ({}))) as {
          assets?: LibraryAsset[];
          error?: string;
        };
        if (!seasonResponse.ok) {
          throw new Error(seasonPayload.error ?? "Failed to load season media.");
        }
        seasonAssets = seasonPayload.assets ?? [];
      }

      const all = [...(showPayload.assets ?? []), ...seasonAssets]
        .filter((asset) => {
          const kind = normalizeKind(asset.kind);
          return kind === "poster" || kind === "backdrop";
        })
        .filter((asset) => typeof asset.hosted_url === "string" && asset.hosted_url.trim().length > 0);

      const deduped = Array.from(
        new Map(all.map((asset) => [asset.hosted_url, asset])).values(),
      );
      setLibraryAssets(deduped);
    } catch (error) {
      setLibraryAssets([]);
      setLibraryError(error instanceof Error ? error.message : "Failed to load library assets.");
    } finally {
      setLibraryLoading(false);
    }
  }, [selectedSeason, selectedShowId]);

  const onUploadSelected = useCallback(
    (file: File | null | undefined) => {
      if (!file) return;
      const objectUrl = URL.createObjectURL(file);
      onSelect({
        imageUrl: objectUrl,
        imageIdentity: `upload:${file.name}:${file.size}:${file.lastModified}`,
        sourceType: "upload",
        sourceImageUrl: null,
        trrShowId: selectedShowId,
        seasonNumber: selectedSeason,
      });
      onClose();
    },
    [onClose, onSelect, selectedSeason, selectedShowId],
  );

  const onUploadInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onUploadSelected(event.target.files?.[0]);
    },
    [onUploadSelected],
  );

  const onUseUrl = useCallback(() => {
    const raw = urlInput.trim();
    try {
      const parsed = new URL(raw);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("Only http/https URLs are supported.");
      }
      setUrlError(null);
      onSelect({
        imageUrl: toProxyUrl(raw),
        imageIdentity: `url:${raw}`,
        sourceType: "url",
        sourceImageUrl: raw,
        trrShowId: selectedShowId,
        seasonNumber: selectedSeason,
      });
      onClose();
    } catch {
      setUrlError("Enter a valid image URL.");
    }
  }, [onClose, onSelect, selectedSeason, selectedShowId, urlInput]);

  const canLoadLibrary = selectedShowId !== null;

  const selectedShowLabel = useMemo(
    () => showOptions.find((show) => show.id === selectedShowId)?.name ?? selectedShowId ?? "",
    [selectedShowId, showOptions],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <h3 className="text-xl font-bold text-zinc-900">Select Image</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
          >
            Close
          </button>
        </div>

        <div className="border-b border-zinc-200 px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: "upload" as const, label: "Upload" },
              { id: "url" as const, label: "URL" },
              { id: "library" as const, label: "Library" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-h-[70vh] overflow-auto px-5 py-4">
          <section className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">Library Scope</p>
            <div className="mt-2 grid gap-3 lg:grid-cols-[1fr,16rem,auto]">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Show</label>
                <input
                  type="text"
                  value={showQuery || selectedShowLabel}
                  onChange={(event) => {
                    setShowQuery(event.target.value);
                    if (event.target.value.trim().length === 0) {
                      setSelectedShowId(defaultShowId ?? null);
                    }
                  }}
                  placeholder="Search show..."
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                />
                {showSearchLoading && <p className="mt-1 text-xs text-zinc-500">Searching…</p>}
                {showOptions.length > 0 && showQuery.trim().length > 0 && (
                  <div className="mt-2 max-h-36 overflow-auto rounded-lg border border-zinc-200 bg-white">
                    {showOptions.map((show) => (
                      <button
                        key={show.id}
                        type="button"
                        onClick={() => {
                          setSelectedShowId(show.id);
                          setShowQuery(show.name);
                        }}
                        className={`block w-full border-b border-zinc-100 px-3 py-2 text-left text-sm last:border-b-0 ${
                          selectedShowId === show.id ? "bg-blue-50 text-blue-700" : "text-zinc-700 hover:bg-zinc-50"
                        }`}
                      >
                        {show.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Season</label>
                <select
                  value={selectedSeason ?? "all"}
                  onChange={(event) => {
                    setSelectedSeason(event.target.value === "all" ? null : parseInt(event.target.value, 10));
                  }}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                  disabled={seasonsLoading || selectedShowId === null}
                >
                  <option value="all">ALL</option>
                  {seasons.map((season) => (
                    <option key={season.season_number} value={season.season_number}>
                      Season {season.season_number}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => void loadLibraryAssets()}
                  disabled={!canLoadLibrary || libraryLoading}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {libraryLoading ? "Loading…" : "Load Media"}
                </button>
              </div>
            </div>
          </section>

          {activeTab === "upload" && (
            <section className="rounded-xl border border-zinc-200 bg-white p-4">
              <label
                htmlFor="color-lab-upload"
                onDragOver={(event) => {
                  event.preventDefault();
                  setUploadDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setUploadDragActive(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setUploadDragActive(false);
                  const file = event.dataTransfer?.files?.[0];
                  onUploadSelected(file);
                }}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-16 text-center transition ${
                  uploadDragActive
                    ? "border-blue-400 bg-blue-50"
                    : "border-zinc-300 bg-zinc-50"
                }`}
              >
                <p className="text-lg font-semibold text-zinc-800">Browse or drop image</p>
                <p className="mt-1 text-sm text-zinc-500">PNG, JPG, WEBP</p>
              </label>
              <input id="color-lab-upload" type="file" accept="image/*" className="hidden" onChange={onUploadInputChange} />
            </section>
          )}

          {activeTab === "url" && (
            <section className="rounded-xl border border-zinc-200 bg-white p-4">
              <label className="mb-1 block text-sm font-semibold text-zinc-700">Image URL</label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(event) => {
                    setUrlInput(event.target.value);
                    setUrlError(null);
                  }}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
                />
                <button
                  type="button"
                  onClick={onUseUrl}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Use URL
                </button>
              </div>
              {urlError && <p className="mt-2 text-xs font-semibold text-red-600">{urlError}</p>}
            </section>
          )}

          {activeTab === "library" && (
            <section className="rounded-xl border border-zinc-200 bg-white p-4">
              {libraryError && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {libraryError}
                </div>
              )}
              {libraryAssets.length === 0 ? (
                <p className="text-sm text-zinc-500">No media loaded yet. Choose show/season and click Load Media.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {libraryAssets.map((asset) => (
                    <button
                      key={`${asset.id}:${asset.hosted_url}`}
                      type="button"
                      onClick={() => {
                        onSelect({
                          imageUrl: toProxyUrl(asset.hosted_url),
                          imageIdentity: `library:${asset.id}:${asset.hosted_url}`,
                          sourceType: "media_library",
                          sourceImageUrl: asset.hosted_url,
                          trrShowId: selectedShowId,
                          seasonNumber: selectedSeason,
                        });
                        onClose();
                      }}
                      className="rounded-lg border border-zinc-200 p-2 text-left transition hover:bg-zinc-50"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={asset.hosted_url}
                        alt={asset.caption ?? asset.kind ?? "Library asset"}
                        className="h-28 w-full rounded object-cover"
                      />
                      <p className="mt-2 truncate text-xs font-semibold text-zinc-700">{asset.kind}</p>
                      <p className="truncate text-xs text-zinc-500">{asset.caption ?? asset.source ?? "Asset"}</p>
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
