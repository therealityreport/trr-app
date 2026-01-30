"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import ClientOnly from "@/components/ClientOnly";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { auth } from "@/lib/firebase";

// ============================================================================
// Types
// ============================================================================

interface TrrShow {
  id: string;
  name: string;
  imdb_id: string | null;
  show_total_seasons: number | null;
}

interface ImageCandidate {
  id: string;
  original_url: string;
  best_url: string;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  context: string | null;
  thumbnail_url: string;
}

interface ScrapePreviewResponse {
  url: string;
  page_title: string | null;
  domain: string;
  images: ImageCandidate[];
  total_found: number;
  error: string | null;
}

interface ImportedAsset {
  id: string;
  hosted_url: string;
  width: number | null;
  height: number | null;
  caption: string | null;
}

interface ImportResponse {
  imported: number;
  skipped_duplicates: number;
  errors: string[];
  assets: ImportedAsset[];
}

// ============================================================================
// Component
// ============================================================================

export default function ScrapeImagesPage() {
  const { user, checking, hasAccess } = useAdminGuard();

  // Form state
  const [url, setUrl] = useState("");
  const [showId, setShowId] = useState("");
  const [seasonNumber, setSeasonNumber] = useState<number | "">("");

  // Show search
  const [showQuery, setShowQuery] = useState("");
  const [showResults, setShowResults] = useState<TrrShow[]>([]);
  const [selectedShow, setSelectedShow] = useState<TrrShow | null>(null);
  const [searchingShows, setSearchingShows] = useState(false);

  // Scrape state
  const [scraping, setScraping] = useState(false);
  const [previewData, setPreviewData] = useState<ScrapePreviewResponse | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [captions, setCaptions] = useState<Record<string, string>>({});

  // Import state
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Get auth headers
  const getAuthHeaders = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Not authenticated");
    return { Authorization: `Bearer ${token}` };
  }, []);

  // Search shows
  const searchShows = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setShowResults([]);
        return;
      }

      try {
        setSearchingShows(true);
        const headers = await getAuthHeaders();
        const response = await fetch(
          `/api/admin/trr-api/shows?q=${encodeURIComponent(query)}&limit=10`,
          { headers }
        );

        if (!response.ok) {
          throw new Error("Failed to search shows");
        }

        const data = await response.json();
        setShowResults(data.shows ?? []);
      } catch (err) {
        console.error("Show search error:", err);
        setShowResults([]);
      } finally {
        setSearchingShows(false);
      }
    },
    [getAuthHeaders]
  );

  // Debounced show search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (showQuery.trim()) {
        searchShows(showQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [showQuery, searchShows]);

  // Select show
  const handleSelectShow = (show: TrrShow) => {
    setSelectedShow(show);
    setShowId(show.id);
    setShowQuery(show.name);
    setShowResults([]);
  };

  // Scrape URL for images
  const handleScrape = async () => {
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    try {
      setError(null);
      setScraping(true);
      setPreviewData(null);
      setSelectedImages(new Set());
      setCaptions({});
      setImportResult(null);

      const headers = await getAuthHeaders();
      const response = await fetch("/api/admin/scrape/preview", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Scrape failed");
      }

      setPreviewData(data);

      // Auto-select all images
      const allIds = new Set(data.images.map((img: ImageCandidate) => img.id));
      setSelectedImages(allIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scrape failed");
    } finally {
      setScraping(false);
    }
  };

  // Toggle image selection
  const toggleImageSelection = (id: string) => {
    setSelectedImages((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select/deselect all
  const toggleSelectAll = () => {
    if (!previewData) return;
    if (selectedImages.size === previewData.images.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(previewData.images.map((img) => img.id)));
    }
  };

  // Update caption
  const updateCaption = (id: string, caption: string) => {
    setCaptions((prev) => ({ ...prev, [id]: caption }));
  };

  // Import selected images
  const handleImport = async () => {
    if (!showId) {
      setError("Please select a show");
      return;
    }
    if (seasonNumber === "") {
      setError("Please enter a season number");
      return;
    }
    if (selectedImages.size === 0) {
      setError("Please select at least one image");
      return;
    }
    if (!previewData) {
      setError("No images to import");
      return;
    }

    try {
      setError(null);
      setImporting(true);

      const imagesToImport = previewData.images
        .filter((img) => selectedImages.has(img.id))
        .map((img) => ({
          candidate_id: img.id,
          url: img.best_url,
          caption: captions[img.id] || null,
        }));

      const headers = await getAuthHeaders();
      const response = await fetch("/api/admin/scrape/import", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          show_id: showId,
          season_number: Number(seasonNumber),
          source_url: url.trim(),
          images: imagesToImport,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Import failed");
      }

      setImportResult(data);
      setPreviewData(null);
      setSelectedImages(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  // Loading state
  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return null;
  }

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        {/* Header */}
        <header className="border-b border-zinc-200 bg-white px-6 py-6">
          <div className="mx-auto max-w-6xl">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                &larr; Admin
              </Link>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                  Media Tools
                </p>
                <h1 className="text-2xl font-bold text-zinc-900">
                  Scrape Images from URL
                </h1>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-8">
          {/* Error Display */}
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={() => setError(null)}
                className="mt-2 text-xs font-semibold text-red-600 hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Input Form */}
          <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-zinc-900">
              Step 1: Enter URL and Select Show
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              {/* URL Input */}
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-semibold text-zinc-700">
                  URL to Scrape <span className="text-red-500">*</span>
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://deadline.com/article-with-images..."
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              {/* Show Search */}
              <div className="relative">
                <label className="mb-1 block text-sm font-semibold text-zinc-700">
                  Show <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={showQuery}
                  onChange={(e) => {
                    setShowQuery(e.target.value);
                    if (!e.target.value.trim()) {
                      setSelectedShow(null);
                      setShowId("");
                    }
                  }}
                  placeholder="Search for a show..."
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
                {searchingShows && (
                  <div className="absolute right-3 top-9">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
                  </div>
                )}
                {/* Search Results Dropdown */}
                {showResults.length > 0 && !selectedShow && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-zinc-200 bg-white shadow-lg">
                    {showResults.map((show) => (
                      <button
                        key={show.id}
                        type="button"
                        onClick={() => handleSelectShow(show)}
                        className="block w-full px-4 py-2 text-left text-sm hover:bg-zinc-50"
                      >
                        <span className="font-semibold">{show.name}</span>
                        {show.show_total_seasons && (
                          <span className="ml-2 text-zinc-500">
                            ({show.show_total_seasons} seasons)
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Season Number */}
              <div>
                <label className="mb-1 block text-sm font-semibold text-zinc-700">
                  Season Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={99}
                  value={seasonNumber}
                  onChange={(e) =>
                    setSeasonNumber(e.target.value ? Number(e.target.value) : "")
                  }
                  placeholder="e.g., 14"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>
            </div>

            {/* Selected Show Display */}
            {selectedShow && (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2">
                <p className="text-sm text-green-800">
                  <span className="font-semibold">Selected:</span> {selectedShow.name}
                  {selectedShow.imdb_id && (
                    <span className="ml-2 text-green-600">({selectedShow.imdb_id})</span>
                  )}
                </p>
              </div>
            )}

            {/* Scrape Button */}
            <div className="mt-6">
              <button
                onClick={handleScrape}
                disabled={scraping || !url.trim()}
                className="rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {scraping ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Scraping...
                  </span>
                ) : (
                  "Scrape Images"
                )}
              </button>
            </div>
          </section>

          {/* Preview Section */}
          {previewData && (
            <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900">
                    Step 2: Select Images to Import
                  </h2>
                  <p className="text-sm text-zinc-500">
                    {previewData.page_title && (
                      <span className="font-medium">{previewData.page_title}</span>
                    )}
                    <span className="mx-2">·</span>
                    {previewData.total_found} images found from {previewData.domain}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={toggleSelectAll}
                    className="text-sm font-semibold text-zinc-600 hover:text-zinc-900"
                  >
                    {selectedImages.size === previewData.images.length
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-600">
                    {selectedImages.size} selected
                  </span>
                </div>
              </div>

              {/* Image Grid */}
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {previewData.images.map((img) => {
                  const isSelected = selectedImages.has(img.id);
                  return (
                    <div
                      key={img.id}
                      className={`group relative overflow-hidden rounded-lg border-2 transition ${
                        isSelected
                          ? "border-green-500 bg-green-50"
                          : "border-zinc-200 bg-zinc-50"
                      }`}
                    >
                      {/* Image */}
                      <div
                        className="relative aspect-square cursor-pointer"
                        onClick={() => toggleImageSelection(img.id)}
                      >
                        <Image
                          src={img.thumbnail_url}
                          alt={img.alt_text || "Scraped image"}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          unoptimized
                        />
                        {/* Checkbox Overlay */}
                        <div
                          className={`absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                            isSelected
                              ? "border-green-500 bg-green-500 text-white"
                              : "border-white bg-white/80"
                          }`}
                        >
                          {isSelected && (
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          )}
                        </div>
                        {/* Dimensions Badge */}
                        {img.width && (
                          <div className="absolute bottom-2 right-2 rounded bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">
                            {img.width}w
                          </div>
                        )}
                      </div>

                      {/* Caption Input */}
                      {isSelected && (
                        <div className="p-2">
                          <input
                            type="text"
                            value={captions[img.id] || ""}
                            onChange={(e) => updateCaption(img.id, e.target.value)}
                            placeholder="Add caption (optional)"
                            className="w-full rounded border border-zinc-200 px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}

                      {/* Alt Text Preview */}
                      {img.alt_text && (
                        <div className="border-t border-zinc-100 p-2">
                          <p className="truncate text-xs text-zinc-500">
                            {img.alt_text}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Import Button */}
              <div className="mt-6 flex items-center gap-4">
                <button
                  onClick={handleImport}
                  disabled={
                    importing ||
                    selectedImages.size === 0 ||
                    !showId ||
                    seasonNumber === ""
                  }
                  className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {importing ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Importing...
                    </span>
                  ) : (
                    `Import ${selectedImages.size} Image${selectedImages.size !== 1 ? "s" : ""}`
                  )}
                </button>
                {(!showId || seasonNumber === "") && (
                  <p className="text-sm text-amber-600">
                    Please select a show and enter a season number above
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Import Result */}
          {importResult && (
            <section className="rounded-2xl border border-green-200 bg-green-50 p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-green-900">
                Import Complete
              </h2>
              <div className="mb-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-white p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {importResult.imported}
                  </p>
                  <p className="text-sm text-zinc-600">Imported</p>
                </div>
                <div className="rounded-lg bg-white p-4 text-center">
                  <p className="text-3xl font-bold text-amber-600">
                    {importResult.skipped_duplicates}
                  </p>
                  <p className="text-sm text-zinc-600">Duplicates Skipped</p>
                </div>
                <div className="rounded-lg bg-white p-4 text-center">
                  <p className="text-3xl font-bold text-red-600">
                    {importResult.errors.length}
                  </p>
                  <p className="text-sm text-zinc-600">Errors</p>
                </div>
              </div>

              {/* Error Details */}
              {importResult.errors.length > 0 && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="mb-2 text-sm font-semibold text-red-800">Errors:</p>
                  <ul className="list-inside list-disc text-sm text-red-700">
                    {importResult.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Imported Assets Preview */}
              {importResult.assets.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-green-800">
                    Imported Images:
                  </p>
                  <div className="grid gap-2 sm:grid-cols-4 md:grid-cols-6">
                    {importResult.assets.slice(0, 12).map((asset) => (
                      <div
                        key={asset.id}
                        className="relative aspect-square overflow-hidden rounded-lg bg-white"
                      >
                        <Image
                          src={asset.hosted_url}
                          alt={asset.caption || "Imported image"}
                          fill
                          className="object-cover"
                          sizes="100px"
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                  {importResult.assets.length > 12 && (
                    <p className="mt-2 text-sm text-green-700">
                      +{importResult.assets.length - 12} more images
                    </p>
                  )}
                </div>
              )}

              {/* Start Over Button */}
              <div className="mt-6">
                <button
                  onClick={() => {
                    setUrl("");
                    setPreviewData(null);
                    setImportResult(null);
                    setSelectedImages(new Set());
                    setCaptions({});
                  }}
                  className="rounded-lg border border-green-600 px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-100"
                >
                  Scrape Another URL
                </button>
              </div>
            </section>
          )}
        </main>
      </div>
    </ClientOnly>
  );
}
