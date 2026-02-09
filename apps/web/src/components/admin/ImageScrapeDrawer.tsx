"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { auth } from "@/lib/firebase";
import { formatImageCandidateBadgeText } from "@/lib/image-scrape-preview";
import {
  PeopleSearchMultiSelect,
  type PersonOption,
} from "@/components/admin/PeopleSearchMultiSelect";

function normalizePersonName(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "") // collapse apostrophes so "O'Connor" matches "OConnor"
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCastContext(input: { context: string | null; alt_text: string | null }): {
  name: string | null;
  caption: string | null;
} {
  const raw = (input.context ?? "").trim() || (input.alt_text ?? "").trim();
  if (!raw) return { name: null, caption: null };

  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length >= 2) {
    const name = lines[0] || null;
    const caption = lines.slice(1).join("\n").trim() || null;
    return { name, caption };
  }

  // Fallback heuristics for single-line contexts.
  const single = lines[0] ?? raw;
  const colonIdx = single.indexOf(":");
  if (colonIdx > 0 && colonIdx < 80) {
    const name = single.slice(0, colonIdx).trim() || null;
    const caption = single.slice(colonIdx + 1).trim() || null;
    return { name, caption };
  }

  return { name: null, caption: single.trim() || null };
}

function bestNameMatch(
  name: string,
  candidates: Array<{ normalized: string; person: PersonOption }>
): PersonOption | null {
  const normalized = normalizePersonName(name);
  if (!normalized) return null;

  const direct = candidates.find((c) => c.normalized === normalized);
  if (direct) return direct.person;

  const nameTokens = new Set(normalized.split(" ").filter(Boolean));
  if (nameTokens.size === 0) return null;

  let best: { score: number; person: PersonOption } | null = null;
  for (const candidate of candidates) {
    const candidateTokens = candidate.normalized.split(" ").filter(Boolean);
    if (candidateTokens.length === 0) continue;

    let common = 0;
    for (const token of candidateTokens) {
      if (nameTokens.has(token)) common += 1;
    }
    const score = common / Math.max(nameTokens.size, candidateTokens.length);
    if (!best || score > best.score) best = { score, person: candidate.person };
  }

  return best && best.score >= 0.8 ? best.person : null;
}

// ============================================================================
// Types
// ============================================================================

interface ImageCandidate {
  id: string;
  original_url: string;
  best_url: string;
  width: number | null;
  height: number | null;
  bytes?: number | null;
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
  kind?: ImageKind;
  linked: boolean;
  linking: boolean;
}

// Entity context - pass one of these to pre-configure the drawer
export interface SeasonContext {
  type: "season";
  showId: string;
  showName: string;
  seasonNumber: number;
  seasonId?: string;
}

export interface PersonContext {
  type: "person";
  personId: string;
  personName: string;
}

export type EntityContext = SeasonContext | PersonContext;

type ImageKind =
  | "poster"
  | "backdrop"
  | "episode_still"
  | "cast"
  | "promo"
  | "intro"
  | "reunion"
  | "other";

const IMAGE_KIND_OPTIONS: Array<{ value: ImageKind; label: string }> = [
  { value: "poster", label: "Poster" },
  { value: "backdrop", label: "Backdrop" },
  { value: "episode_still", label: "Episode Still" },
  { value: "cast", label: "Cast Photos" },
  { value: "promo", label: "Promo" },
  { value: "intro", label: "Intro" },
  { value: "reunion", label: "Reunion" },
  { value: "other", label: "Other" },
];

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
  const seasonCastIndexRef = useRef<Array<{ normalized: string; person: PersonOption }> | null>(
    null
  );
  const seasonCastLoadingRef = useRef<Promise<
    Array<{ normalized: string; person: PersonOption }> | null
  > | null>(null);

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

  // People tagging
  const [bulkPeopleSelection, setBulkPeopleSelection] = useState<PersonOption[]>([]);
  // Map of image candidate ID -> assigned people
  const [personAssignments, setPersonAssignments] = useState<Record<string, PersonOption[]>>({});
  // Map of image candidate ID -> image kind
  const [imageKinds, setImageKinds] = useState<Record<string, ImageKind>>({});

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Get auth headers
  const getAuthHeaders = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Not authenticated");
    return { Authorization: `Bearer ${token}` };
  }, []);

  const ensureSeasonCastIndex = useCallback(async () => {
    if (entityContext.type !== "season") return null;
    if (seasonCastIndexRef.current) return seasonCastIndexRef.current;
    if (seasonCastLoadingRef.current) return seasonCastLoadingRef.current;

    seasonCastLoadingRef.current = (async () => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(
          `/api/admin/trr-api/shows/${entityContext.showId}/seasons/${entityContext.seasonNumber}/cast?limit=500`,
          { headers }
        );
        if (!response.ok) return null;
        const data = (await response.json().catch(() => ({}))) as {
          cast?: Array<{ person_id?: string; person_name?: string | null }>;
        };
        const cast = Array.isArray(data.cast) ? data.cast : [];
        const index = cast
          .map((row) => {
            const id = typeof row.person_id === "string" ? row.person_id : null;
            const name = typeof row.person_name === "string" ? row.person_name : null;
            if (!id || !name) return null;
            return {
              normalized: normalizePersonName(name),
              person: { id, name },
            };
          })
          .filter(
            (row): row is { normalized: string; person: PersonOption } =>
              Boolean(row?.normalized && row.person.id && row.person.name)
          );
        seasonCastIndexRef.current = index;
        return index;
      } catch {
        return null;
      } finally {
        seasonCastLoadingRef.current = null;
      }
    })();

    return seasonCastLoadingRef.current;
  }, [entityContext, getAuthHeaders]);

  const autoFillCastFromContext = useCallback(
    async (imageIds: Iterable<string>) => {
      if (!previewData) return;
      if (entityContext.type !== "season") return;

      const castIndex = await ensureSeasonCastIndex();
      if (!castIndex || castIndex.length === 0) return;

      const imagesById = new Map(previewData.images.map((img) => [img.id, img]));
      const captionUpdates: Record<string, string> = {};
      const assignmentUpdates: Record<string, PersonOption[]> = {};

      for (const id of imageIds) {
        const img = imagesById.get(id);
        if (!img) continue;
        const parsed = parseCastContext({ context: img.context, alt_text: img.alt_text });
        if (parsed.caption) {
          captionUpdates[id] = parsed.caption;
        }
        if (parsed.name) {
          const match = bestNameMatch(parsed.name, castIndex);
          if (match) {
            assignmentUpdates[id] = [match];
          }
        }
      }

      if (Object.keys(captionUpdates).length > 0) {
        setCaptions((prev) => {
          const next = { ...prev };
          for (const [id, caption] of Object.entries(captionUpdates)) {
            if (next[id] === undefined) next[id] = caption;
          }
          return next;
        });
      }

      if (Object.keys(assignmentUpdates).length > 0) {
        setPersonAssignments((prev) => {
          const next = { ...prev };
          for (const [id, people] of Object.entries(assignmentUpdates)) {
            if (!next[id] || next[id].length === 0) {
              next[id] = people;
            }
          }
          return next;
        });
      }
    },
    [previewData, entityContext.type, ensureSeasonCastIndex]
  );

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
            ? entityContext.seasonId
            : entityContext.personId;

        if (entityContext.type === "season" && !entityId) {
          throw new Error("Missing seasonId for season import context");
        }

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
            kind: entityType === "season" ? duplicate.kind || "other" : "gallery",
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
      setImageKinds({});
      setBulkPeopleSelection([]);
      setImportProgress(null);
      setImportResult(null);
      setDuplicates([]);
      setError(null);
    }
  }, [isOpen]);

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
      setImageKinds({});
      setBulkPeopleSelection([]);
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
          kind: imageKinds[img.id] || "other",
          person_ids: (personAssignments[img.id] ?? []).map((p) => p.id),
        }));

      const urlToKindMap = new Map<string, ImageKind>();
      for (const img of imagesToImport) {
        urlToKindMap.set(img.url, img.kind as ImageKind);
      }

      // Build payload based on entity context
      const payload =
        entityContext.type === "season"
          ? {
              entity_type: "season" as const,
              show_id: entityContext.showId,
              season_number: entityContext.seasonNumber,
              ...(entityContext.seasonId ? { season_id: entityContext.seasonId } : {}),
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
                  const duplicateKind =
                    urlToKindMap.get(data.url) ?? "other";
                  setDuplicates((prev) => [
                    ...prev,
                    {
                      url: data.url,
                      media_asset_id: data.media_asset_id,
                      kind: duplicateKind,
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

              {/* Bulk assignments */}
              {selectedImages.size > 0 && (
                <div className="mb-4 grid gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  {entityContext.type === "season" && (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-semibold text-zinc-600">
                        Set kind for all selected:
                      </span>
                      <select
                        onChange={(e) => {
                          const value = e.target.value as ImageKind;
                          if (!value) return;
                          setImageKinds((prev) => {
                            const next = { ...prev };
                            for (const imgId of selectedImages) {
                              next[imgId] = value;
                            }
                            return next;
                          });
                          if (value === "cast") {
                            void autoFillCastFromContext(selectedImages);
                          }
                          e.target.value = "";
                        }}
                        className="rounded border border-zinc-200 px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none"
                      >
                        <option value="">Select kind...</option>
                        {IMAGE_KIND_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid gap-2">
                    <span className="text-xs font-semibold text-zinc-600">
                      Tag people for all selected:
                    </span>
                    <PeopleSearchMultiSelect
                      value={bulkPeopleSelection}
                      onChange={setBulkPeopleSelection}
                      getAuthHeaders={getAuthHeaders}
                      disabled={importing}
                      placeholder="Search and add people..."
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPersonAssignments((prev) => {
                            const next = { ...prev };
                            for (const imgId of selectedImages) {
                              if (bulkPeopleSelection.length > 0) {
                                next[imgId] = [...bulkPeopleSelection];
                              } else {
                                delete next[imgId];
                              }
                            }
                            return next;
                          });
                        }}
                        className="rounded bg-zinc-900 px-2 py-1 text-xs font-semibold text-white hover:bg-zinc-800"
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkPeopleSelection([])}
                        className="text-xs font-medium text-zinc-600 hover:text-zinc-800"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {Object.keys(personAssignments).length > 0 && (
                    <button
                      type="button"
                      onClick={() => setPersonAssignments({})}
                      className="text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      Clear all people tags
                    </button>
                  )}
                </div>
              )}

              {/* Image Grid */}
              <div className="mb-6 grid grid-cols-3 gap-3">
                {previewData.images.map((img) => {
                  const isSelected = selectedImages.has(img.id);
                  const badgeText = formatImageCandidateBadgeText({
                    width: img.width,
                    height: img.height,
                    bytes: img.bytes ?? null,
                  });
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
                        {badgeText && (
                          <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            {badgeText}
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
                          <select
                            value={imageKinds[img.id] || "other"}
                            onChange={(e) => {
                              const value = e.target.value as ImageKind;
                              setImageKinds((prev) => ({ ...prev, [img.id]: value }));
                              if (value === "cast") {
                                void autoFillCastFromContext([img.id]);
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full rounded border border-zinc-200 px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none"
                          >
                            {IMAGE_KIND_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <PeopleSearchMultiSelect
                            value={personAssignments[img.id] ?? []}
                            onChange={(nextPeople) => {
                              setPersonAssignments((prev) => {
                                const next = { ...prev };
                                if (nextPeople.length > 0) {
                                  next[img.id] = nextPeople;
                                } else {
                                  delete next[img.id];
                                }
                                return next;
                              });
                            }}
                            getAuthHeaders={getAuthHeaders}
                            disabled={importing}
                            placeholder="Tag people..."
                          />
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
