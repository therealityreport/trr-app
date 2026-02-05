"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { auth } from "@/lib/firebase";

// ============================================================================
// Types
// ============================================================================

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
  media_asset_id?: string; // Present for duplicates if backend provides it
}

interface DuplicateImage {
  url: string;
  media_asset_id: string;
  linked: boolean;
  linking: boolean;
}

interface SeasonCastMember {
  person_id: string;
  person_name: string | null;
  episodes_in_season: number;
  photo_url: string | null;
}

// Entity context - pass one of these to pre-configure the drawer
export interface SeasonContext {
  type: "season";
  showId: string;
  showName: string;
  seasonNumber: number;
}

export interface PersonContext {
  type: "person";
  personId: string;
  personName: string;
}

export type EntityContext = SeasonContext | PersonContext;

interface ImageScrapeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entityContext: EntityContext;
  onImportComplete?: (result: ImportResponse) => void;
}

// ============================================================================
// Icons
// ============================================================================

const XIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

// ============================================================================
// Component
// ============================================================================

export function ImageScrapeDrawer({
  isOpen,
  onClose,
  entityContext,
  onImportComplete,
}: ImageScrapeDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Form state
  const [url, setUrl] = useState("");

  // Scrape state
  const [scraping, setScraping] = useState(false);
  const [previewData, setPreviewData] = useState<ScrapePreviewResponse | null>(null);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [captions, setCaptions] = useState<Record<string, string>>({});

  // Import state
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [importResult, setImportResult] = useState<ImportResponse | null>(null);

  // Duplicate tracking for linking
  const [duplicates, setDuplicates] = useState<DuplicateImage[]>([]);

  // Season cast members (for assigning images to cast)
  const [seasonCast, setSeasonCast] = useState<SeasonCastMember[]>([]);
  const [castLoading, setCastLoading] = useState(false);
  // Map of image candidate ID -> assigned person_id
  const [personAssignments, setPersonAssignments] = useState<Record<string, string>>({});

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Get auth headers
  const getAuthHeaders = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Not authenticated");
    return { Authorization: `Bearer ${token}` };
  }, []);

  // Link a duplicate image to the current entity
  const linkDuplicate = useCallback(
    async (duplicate: DuplicateImage) => {
      // Mark as linking
      setDuplicates((prev) =>
        prev.map((d) =>
          d.media_asset_id === duplicate.media_asset_id
            ? { ...d, linking: true }
            : d
        )
      );

      try {
        const headers = await getAuthHeaders();

        // Determine entity type and ID
        const entityType = entityContext.type;
        const entityId =
          entityContext.type === "season"
            ? entityContext.showId // For seasons, we link to the show with season context
            : entityContext.personId;

        const response = await fetch("/api/admin/trr-api/media-links", {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            media_asset_id: duplicate.media_asset_id,
            entity_type: entityType === "season" ? "season" : "person",
            entity_id: entityId,
            kind: "gallery",
            context:
              entityContext.type === "season"
                ? {
                    show_id: entityContext.showId,
                    season_number: entityContext.seasonNumber,
                  }
                : {},
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to link image");
        }

        // Mark as linked
        setDuplicates((prev) =>
          prev.map((d) =>
            d.media_asset_id === duplicate.media_asset_id
              ? { ...d, linked: true, linking: false }
              : d
          )
        );
      } catch (err) {
        console.error("Failed to link duplicate:", err);
        // Reset linking state on error
        setDuplicates((prev) =>
          prev.map((d) =>
            d.media_asset_id === duplicate.media_asset_id
              ? { ...d, linking: false }
              : d
          )
        );
      }
    },
    [entityContext, getAuthHeaders]
  );

  // Link all unlinked duplicates
  const linkAllDuplicates = useCallback(async () => {
    const unlinked = duplicates.filter((d) => !d.linked && !d.linking);
    for (const dup of unlinked) {
      await linkDuplicate(dup);
    }
  }, [duplicates, linkDuplicate]);

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setUrl("");
      setPreviewData(null);
      setSelectedImages(new Set());
      setCaptions({});
      setPersonAssignments({});
      setImportProgress(null);
      setImportResult(null);
      setDuplicates([]);
      setError(null);
    }
  }, [isOpen]);

  // Fetch season cast when drawer opens in season context
  useEffect(() => {
    if (!isOpen || entityContext.type !== "season") {
      setSeasonCast([]);
      return;
    }

    const fetchSeasonCast = async () => {
      try {
        setCastLoading(true);
        const headers = await getAuthHeaders();
        const response = await fetch(
          `/api/admin/trr-api/shows/${entityContext.showId}/seasons/${entityContext.seasonNumber}/cast?limit=500`,
          { headers }
        );
        if (!response.ok) {
          console.error("Failed to fetch season cast");
          return;
        }
        const data = await response.json();
        setSeasonCast(data.cast || []);
      } catch (err) {
        console.error("Failed to fetch season cast:", err);
      } finally {
        setCastLoading(false);
      }
    };

    fetchSeasonCast();
  }, [isOpen, entityContext, getAuthHeaders]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !importing) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, importing, onClose]);

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
      setPersonAssignments({});
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
          person_id: personAssignments[img.id] || null,
        }));

      // Build payload based on entity context
      const payload =
        entityContext.type === "season"
          ? {
              entity_type: "season" as const,
              show_id: entityContext.showId,
              season_number: entityContext.seasonNumber,
              source_url: url.trim(),
              images: imagesToImport,
            }
          : {
              entity_type: "person" as const,
              person_id: entityContext.personId,
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
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (
                data.status === "downloading" ||
                data.status === "success" ||
                data.status === "duplicate" ||
                data.status === "error"
              ) {
                setImportProgress({
                  current: data.current,
                  total: data.total,
                  url: data.url,
                  status: data.status,
                  error: data.error,
                  media_asset_id: data.media_asset_id,
                });

                // Track duplicates that have asset IDs for potential linking
                if (data.status === "duplicate" && data.media_asset_id) {
                  setDuplicates((prev) => [
                    ...prev,
                    {
                      url: data.url,
                      media_asset_id: data.media_asset_id,
                      linked: false,
                      linking: false,
                    },
                  ]);
                }
              }

              // Handle completion
              if (data.imported !== undefined && data.assets !== undefined) {
                const result: ImportResponse = {
                  imported: data.imported,
                  skipped_duplicates: data.skipped_duplicates,
                  errors: data.errors || [],
                  assets: data.assets,
                };
                setImportResult(result);

                // Create person links for imported assets with cast assignments
                if (entityContext.type === "season" && data.assets?.length > 0) {
                  // Build URL to person mapping from original images
                  const urlToPersonMap = new Map<string, string>();
                  for (const img of imagesToImport) {
                    if (img.person_id) {
                      urlToPersonMap.set(img.url, img.person_id);
                    }
                  }

                  // Create person links for assets that had assignments
                  for (const asset of data.assets as ImportedAsset[]) {
                    // Try to find matching person by URL or by hosted_url containing similar path
                    const matchedPersonId = Array.from(urlToPersonMap.entries()).find(
                      ([url]) => asset.hosted_url?.includes(url.split("/").pop() || "NOMATCH")
                    )?.[1];

                    if (matchedPersonId && asset.id) {
                      // Create link to person (fire and forget)
                      fetch("/api/admin/trr-api/media-links", {
                        method: "POST",
                        headers: {
                          Authorization: `Bearer ${await auth.currentUser?.getIdToken()}`,
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                          media_asset_id: asset.id,
                          entity_type: "person",
                          entity_id: matchedPersonId,
                          kind: "gallery",
                          context: {
                            show_id: entityContext.showId,
                            season_number: entityContext.seasonNumber,
                          },
                        }),
                      }).catch((err) => console.error("Failed to link asset to person:", err));
                    }
                  }
                }

                setPreviewData(null);
                setSelectedImages(new Set());
                onImportComplete?.(result);
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

  // Get entity display name
  const entityDisplayName =
    entityContext.type === "season"
      ? `${entityContext.showName} - Season ${entityContext.seasonNumber}`
      : entityContext.personName;

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 transition-opacity"
        onClick={importing ? undefined : onClose}
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl overflow-y-auto bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="drawer-title" className="text-lg font-semibold text-zinc-900">
                Import Images
              </h2>
              <p className="text-sm text-zinc-500">{entityDisplayName}</p>
            </div>
            <button
              onClick={onClose}
              disabled={importing}
              className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-50"
              aria-label="Close drawer"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
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

          {/* URL Input */}
          {!importResult && (
            <div className="mb-6">
              <label className="mb-1 block text-sm font-semibold text-zinc-700">
                URL to Scrape
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://deadline.com/article-with-images..."
                  className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                  disabled={scraping || importing}
                />
                <button
                  onClick={handleScrape}
                  disabled={scraping || importing || !url.trim()}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {scraping ? "Scraping..." : "Scrape"}
                </button>
              </div>
            </div>
          )}

          {/* Preview Section */}
          {previewData && !importResult && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">
                    {previewData.total_found} images from {previewData.domain}
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

              {/* Bulk Cast Assignment (season context only) */}
              {entityContext.type === "season" && selectedImages.size > 0 && (
                <div className="mb-4 flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <span className="text-xs font-semibold text-zinc-600">
                    Assign all selected to:
                  </span>
                  {castLoading ? (
                    <span className="text-xs text-zinc-400">Loading cast...</span>
                  ) : seasonCast.length > 0 ? (
                    <select
                      onChange={(e) => {
                        const personId = e.target.value;
                        if (!personId) return;
                        // Assign to all selected images
                        setPersonAssignments((prev) => {
                          const next = { ...prev };
                          for (const imgId of selectedImages) {
                            next[imgId] = personId;
                          }
                          return next;
                        });
                        // Reset select
                        e.target.value = "";
                      }}
                      className="flex-1 rounded border border-zinc-200 px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none"
                    >
                      <option value="">Select cast member...</option>
                      {seasonCast.map((member) => (
                        <option key={member.person_id} value={member.person_id}>
                          {member.person_name || "Unknown"} ({member.episodes_in_season} eps)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-zinc-400">No cast found for this season</span>
                  )}
                  {Object.keys(personAssignments).length > 0 && (
                    <button
                      onClick={() => setPersonAssignments({})}
                      className="text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              )}

              {/* Image Grid */}
              <div className="mb-6 grid grid-cols-3 gap-3">
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
                      <div
                        className="relative aspect-square cursor-pointer"
                        onClick={() => toggleImageSelection(img.id)}
                      >
                        <Image
                          src={img.thumbnail_url}
                          alt={img.alt_text || "Scraped image"}
                          fill
                          className="object-cover"
                          sizes="150px"
                          unoptimized
                        />
                        {/* Checkbox Overlay */}
                        <div
                          className={`absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                            isSelected
                              ? "border-green-500 bg-green-500 text-white"
                              : "border-white bg-white/80"
                          }`}
                        >
                          {isSelected && (
                            <svg
                              width="12"
                              height="12"
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
                          <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            {img.width}w
                          </div>
                        )}
                      </div>

                      {/* Caption and Cast Assignment */}
                      {isSelected && (
                        <div className="space-y-1.5 p-1.5">
                          <input
                            type="text"
                            value={captions[img.id] || ""}
                            onChange={(e) => updateCaption(img.id, e.target.value)}
                            placeholder="Caption"
                            className="w-full rounded border border-zinc-200 px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none"
                            onClick={(e) => e.stopPropagation()}
                          />
                          {/* Cast Member Assignment (season context only) */}
                          {entityContext.type === "season" && seasonCast.length > 0 && (
                            <select
                              value={personAssignments[img.id] || ""}
                              onChange={(e) => {
                                const value = e.target.value;
                                setPersonAssignments((prev) => {
                                  const next = { ...prev };
                                  if (value) {
                                    next[img.id] = value;
                                  } else {
                                    delete next[img.id];
                                  }
                                  return next;
                                });
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full rounded border border-zinc-200 px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none"
                            >
                              <option value="">Assign to cast...</option>
                              {seasonCast.map((member) => (
                                <option key={member.person_id} value={member.person_id}>
                                  {member.person_name || "Unknown"} ({member.episodes_in_season} eps)
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Progress Bar */}
              {importing && importProgress && (
                <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-zinc-700">
                      Importing {importProgress.current} of {importProgress.total}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        importProgress.status === "downloading"
                          ? "bg-blue-100 text-blue-700"
                          : importProgress.status === "success"
                          ? "bg-green-100 text-green-700"
                          : importProgress.status === "duplicate"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {importProgress.status === "downloading" && "Downloading..."}
                      {importProgress.status === "success" && "Imported"}
                      {importProgress.status === "duplicate" && "Duplicate"}
                      {importProgress.status === "error" && "Error"}
                    </span>
                  </div>
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
                  <p className="mt-2 truncate text-xs text-zinc-500">
                    {importProgress.url}
                  </p>
                </div>
              )}

              {/* Import Button */}
              <button
                onClick={handleImport}
                disabled={importing || selectedImages.size === 0}
                className="w-full rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {importing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Importing...
                  </span>
                ) : (
                  `Import ${selectedImages.size} Image${selectedImages.size !== 1 ? "s" : ""}`
                )}
              </button>
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <h3 className="mb-3 text-lg font-semibold text-green-900">
                Import Complete
              </h3>
              <div className="mb-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-white p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {importResult.imported}
                  </p>
                  <p className="text-xs text-zinc-600">Imported</p>
                </div>
                <div className="rounded-lg bg-white p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">
                    {importResult.skipped_duplicates}
                  </p>
                  <p className="text-xs text-zinc-600">Duplicates</p>
                </div>
                <div className="rounded-lg bg-white p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {importResult.errors.length}
                  </p>
                  <p className="text-xs text-zinc-600">Errors</p>
                </div>
              </div>

              {/* Imported Assets Preview */}
              {importResult.assets.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-sm font-semibold text-green-800">
                    Imported Images:
                  </p>
                  <div className="grid grid-cols-6 gap-1">
                    {importResult.assets.slice(0, 12).map((asset) => (
                      <div
                        key={asset.id}
                        className="relative aspect-square overflow-hidden rounded bg-white"
                      >
                        <Image
                          src={asset.hosted_url}
                          alt={asset.caption || "Imported image"}
                          fill
                          className="object-cover"
                          sizes="60px"
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Duplicates that can be linked */}
              {duplicates.length > 0 && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-amber-800">
                      Link Existing Images ({duplicates.filter((d) => !d.linked).length} available)
                    </p>
                    {duplicates.some((d) => !d.linked && !d.linking) && (
                      <button
                        onClick={linkAllDuplicates}
                        className="rounded bg-amber-600 px-2 py-1 text-xs font-semibold text-white transition hover:bg-amber-700"
                      >
                        Link All
                      </button>
                    )}
                  </div>
                  <p className="mb-3 text-xs text-amber-700">
                    These images already exist in the system. Link them to add them to this gallery without re-downloading.
                  </p>
                  <div className="space-y-2">
                    {duplicates.map((dup) => (
                      <div
                        key={dup.media_asset_id}
                        className="flex items-center gap-2 rounded bg-white p-2"
                      >
                        <span className="flex-1 truncate text-xs text-zinc-600">
                          {dup.url.split("/").pop() || dup.url}
                        </span>
                        {dup.linked ? (
                          <span className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                            Linked
                          </span>
                        ) : dup.linking ? (
                          <span className="rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-500">
                            Linking...
                          </span>
                        ) : (
                          <button
                            onClick={() => linkDuplicate(dup)}
                            className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700 transition hover:bg-amber-200"
                          >
                            Link
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setUrl("");
                    setImportResult(null);
                    setDuplicates([]);
                  }}
                  className="flex-1 rounded-lg border border-green-600 px-4 py-2 text-sm font-semibold text-green-700 transition hover:bg-green-100"
                >
                  Import More
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default ImageScrapeDrawer;
