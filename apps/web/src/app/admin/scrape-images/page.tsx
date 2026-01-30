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

type EntityMode = "season" | "person";

interface TrrShow {
  id: string;
  name: string;
  imdb_id: string | null;
  show_total_seasons: number | null;
}

interface TrrPerson {
  id: string;
  full_name: string;
  known_for: string | null;
  external_ids: { imdb?: string; tmdb?: number } | null;
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

interface ImportProgress {
  current: number;
  total: number;
  url: string;
  status: "downloading" | "success" | "duplicate" | "error";
  error?: string;
}

// ============================================================================
// Component
// ============================================================================

export default function ScrapeImagesPage() {
  const { user, checking, hasAccess } = useAdminGuard();

  // Entity mode
  const [entityMode, setEntityMode] = useState<EntityMode>("season");

  // Form state
  const [url, setUrl] = useState("");
  const [showId, setShowId] = useState("");
  const [seasonNumber, setSeasonNumber] = useState<number | "">("");

  // Show search
  const [showQuery, setShowQuery] = useState("");
  const [showResults, setShowResults] = useState<TrrShow[]>([]);
  const [selectedShow, setSelectedShow] = useState<TrrShow | null>(null);
  const [searchingShows, setSearchingShows] = useState(false);

  // Person search
  const [personQuery, setPersonQuery] = useState("");
  const [personResults, setPersonResults] = useState<TrrPerson[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<TrrPerson | null>(null);
  const [searchingPeople, setSearchingPeople] = useState(false);

  // Scrape state
  const [scraping, setScraping] = useState(false);
  const [previewData, setPreviewData] = useState<ScrapePreviewResponse | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [captions, setCaptions] = useState<Record<string, string>>({});

  // Import state
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
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

  // Mode toggle functions
  const switchToSeason = () => {
    setEntityMode("season");
    // Clear person state
    setSelectedPerson(null);
    setPersonQuery("");
    setPersonResults([]);
  };

  const switchToPerson = () => {
    setEntityMode("person");
    // Clear season state
    setSelectedShow(null);
    setShowId("");
    setSeasonNumber("");
    setShowQuery("");
    setShowResults([]);
  };

  // Search people
  const MIN_PERSON_QUERY_LENGTH = 2;

  const searchPeople = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (trimmed.length < MIN_PERSON_QUERY_LENGTH) {
        setPersonResults([]);
        return;
      }

      try {
        setSearchingPeople(true);
        const headers = await getAuthHeaders();
        const response = await fetch(
          `/api/admin/trr-api/people?q=${encodeURIComponent(trimmed)}&limit=10`,
          { headers }
        );

        if (!response.ok) {
          // Swallow 400 errors for short queries
          if (response.status === 400) {
            setPersonResults([]);
            return;
          }
          throw new Error("Failed to search people");
        }

        const data = await response.json();
        setPersonResults(data.people ?? []);
      } catch (err) {
        console.error("Person search error:", err);
        setPersonResults([]);
      } finally {
        setSearchingPeople(false);
      }
    },
    [getAuthHeaders]
  );

  // Debounced person search
  useEffect(() => {
    if (personQuery.trim().length < MIN_PERSON_QUERY_LENGTH) {
      setPersonResults([]);
      return;
    }
    const timer = setTimeout(() => searchPeople(personQuery), 300);
    return () => clearTimeout(timer);
  }, [personQuery, searchPeople]);

  // Select person
  const handleSelectPerson = (person: TrrPerson) => {
    setSelectedPerson(person);
    setPersonQuery(person.full_name);
    setPersonResults([]);
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
      const allIds = new Set<string>(data.images.map((img: ImageCandidate) => img.id));
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

  // Import selected images with SSE streaming progress
  const handleImport = async () => {
    // Validate based on entity mode
    if (entityMode === "season") {
      if (!showId) {
        setError("Please select a show");
        return;
      }
      if (seasonNumber === "") {
        setError("Please enter a season number");
        return;
      }
    } else {
      if (!selectedPerson) {
        setError("Please select a person");
        return;
      }
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
      setImportProgress(null);
      setImportResult(null);

      const imagesToImport = previewData.images
        .filter((img) => selectedImages.has(img.id))
        .map((img) => ({
          candidate_id: img.id,
          url: img.best_url,
          caption: captions[img.id] || null,
        }));

      // Build payload based on entity mode
      const payload =
        entityMode === "season"
          ? {
              entity_type: "season" as const,
              show_id: showId,
              season_number: Number(seasonNumber),
              source_url: url.trim(),
              images: imagesToImport,
            }
          : {
              entity_type: "person" as const,
              person_id: selectedPerson!.id,
              source_url: url.trim(),
              images: imagesToImport,
            };

      const headers = await getAuthHeaders();

      // Use streaming endpoint for progress updates
      const response = await fetch("/api/admin/scrape/import/stream", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        try {
          const data = JSON.parse(text);
          setError(data.error || "Import failed");
        } catch {
          setError("Import failed");
        }
        return;
      }

      // Read SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        setError("No response stream");
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            // Next line should be data
            continue;
          }
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              // Handle different event types
              if (data.status === "downloading" || data.status === "success" ||
                  data.status === "duplicate" || data.status === "error") {
                setImportProgress({
                  current: data.current,
                  total: data.total,
                  url: data.url,
                  status: data.status,
                  error: data.error,
                });
              }

              // Handle completion
              if (data.imported !== undefined && data.assets !== undefined) {
                setImportResult({
                  imported: data.imported,
                  skipped_duplicates: data.skipped_duplicates,
                  errors: data.errors || [],
                  assets: data.assets,
                });
                setPreviewData(null);
                setSelectedImages(new Set());
              }

              // Handle error event
              if (data.error && !data.current) {
                setError(data.error);
              }
            } catch (e) {
              console.error("Failed to parse SSE data:", line, e);
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
      setImportProgress(null);
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
              Step 1: Enter URL and Select Target
            </h2>

            {/* Entity Mode Toggle */}
            <div className="mb-4 flex gap-2">
              <button
                type="button"
                onClick={switchToSeason}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  entityMode === "season"
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                Show/Season
              </button>
              <button
                type="button"
                onClick={switchToPerson}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  entityMode === "person"
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                Person
              </button>
            </div>

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

              {/* Show Search - only in season mode */}
              {entityMode === "season" && (
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
              )}

              {/* Season Number - only in season mode */}
              {entityMode === "season" && (
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
              )}

              {/* Person Search - only in person mode */}
              {entityMode === "person" && (
                <div className="relative md:col-span-2">
                  <label className="mb-1 block text-sm font-semibold text-zinc-700">
                    Person <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={personQuery}
                    onChange={(e) => {
                      setPersonQuery(e.target.value);
                      if (!e.target.value.trim()) {
                        setSelectedPerson(null);
                      }
                    }}
                    placeholder="Search for a person (min 2 characters)..."
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  />
                  {searchingPeople && (
                    <div className="absolute right-3 top-9">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
                    </div>
                  )}
                  {/* Search Results Dropdown */}
                  {personResults.length > 0 && !selectedPerson && (
                    <div className="absolute z-10 mt-1 w-full rounded-lg border border-zinc-200 bg-white shadow-lg">
                      {personResults.map((person) => (
                        <button
                          key={person.id}
                          type="button"
                          onClick={() => handleSelectPerson(person)}
                          className="block w-full px-4 py-2 text-left text-sm hover:bg-zinc-50"
                        >
                          <span className="font-semibold">{person.full_name}</span>
                          {person.external_ids?.imdb && (
                            <span className="ml-2 text-zinc-500">
                              ({person.external_ids.imdb})
                            </span>
                          )}
                          {person.known_for && (
                            <span className="ml-2 text-zinc-400 text-xs">
                              {person.known_for}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Selected Show Display - only in season mode */}
            {entityMode === "season" && selectedShow && (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-2">
                <p className="text-sm text-green-800">
                  <span className="font-semibold">Selected:</span> {selectedShow.name}
                  {selectedShow.imdb_id && (
                    <span className="ml-2 text-green-600">({selectedShow.imdb_id})</span>
                  )}
                </p>
              </div>
            )}

            {/* Selected Person Display - only in person mode */}
            {entityMode === "person" && selectedPerson && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2">
                <p className="text-sm text-green-800">
                  <span className="font-semibold">Selected:</span> {selectedPerson.full_name}
                  {selectedPerson.external_ids?.imdb && (
                    <span className="ml-2 text-green-600">({selectedPerson.external_ids.imdb})</span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPerson(null);
                    setPersonQuery("");
                  }}
                  className="ml-auto text-green-600 hover:text-green-800"
                >
                  ×
                </button>
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

              {/* Import Button & Progress */}
              <div className="mt-6">
                {/* Progress Bar */}
                {importing && importProgress && (
                  <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-semibold text-zinc-700">
                        Importing {importProgress.current} of {importProgress.total}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        importProgress.status === "downloading"
                          ? "bg-blue-100 text-blue-700"
                          : importProgress.status === "success"
                          ? "bg-green-100 text-green-700"
                          : importProgress.status === "duplicate"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {importProgress.status === "downloading" && "Downloading..."}
                        {importProgress.status === "success" && "Imported"}
                        {importProgress.status === "duplicate" && "Duplicate"}
                        {importProgress.status === "error" && "Error"}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                      <div
                        className={`h-full transition-all duration-300 ${
                          importProgress.status === "error"
                            ? "bg-red-500"
                            : importProgress.status === "duplicate"
                            ? "bg-amber-500"
                            : "bg-green-500"
                        }`}
                        style={{
                          width: `${(importProgress.current / importProgress.total) * 100}%`,
                        }}
                      />
                    </div>
                    {/* Current URL (truncated) */}
                    <p className="mt-2 truncate text-xs text-zinc-500">
                      {importProgress.url}
                    </p>
                    {importProgress.error && (
                      <p className="mt-1 text-xs text-red-600">
                        {importProgress.error}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <button
                    onClick={handleImport}
                    disabled={
                      importing ||
                      selectedImages.size === 0 ||
                      (entityMode === "season" && (!showId || seasonNumber === "")) ||
                      (entityMode === "person" && !selectedPerson)
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
                  {entityMode === "season" && (!showId || seasonNumber === "") && (
                    <p className="text-sm text-amber-600">
                      Please select a show and enter a season number above
                    </p>
                  )}
                  {entityMode === "person" && !selectedPerson && (
                    <p className="text-sm text-amber-600">
                      Please select a person above
                    </p>
                  )}
                </div>
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
