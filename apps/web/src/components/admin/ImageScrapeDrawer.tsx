"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { fetchAdminWithAuth, getClientAuthHeaders } from "@/lib/admin/client-auth";
import { formatImageCandidateBadgeText } from "@/lib/image-scrape-preview";

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

function extractDomain(value: string | null): string | null {
  if (!value) return null;
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    const normalized = hostname.replace(/^www\./, "");
    return normalized || null;
  } catch {
    return null;
  }
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
  page_published_at?: string | null;
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
  status: "downloading" | "success" | "duplicate" | "excluded" | "error";
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

interface ShowCastMemberApi {
  person_id: string;
  full_name?: string | null;
  cast_member_name?: string | null;
  role?: string | null;
}

interface SeasonCastMemberApi {
  person_id: string;
  person_name?: string | null;
  episodes_in_season?: number | null;
}

type SeasonCastSource = "season_evidence" | "show_fallback";

interface CastDropdownOption {
  value: string;
  label: string;
  matchName: string;
  personIds: string[];
  isFriend: boolean;
}

// Entity context - pass one of these to pre-configure the drawer
export interface SeasonContext {
  type: "season";
  showId: string;
  showName: string;
  seasonNumber: number;
  seasonId?: string;
}

export interface ShowContext {
  type: "show";
  showId: string;
  showName: string;
  seasons?: Array<{
    seasonNumber: number;
    seasonId?: string;
  }>;
  defaultSeasonNumber?: number | null;
}

export interface PersonContext {
  type: "person";
  personId: string;
  personName: string;
}

export type EntityContext = SeasonContext | ShowContext | PersonContext;

type ImageKind =
  | "poster"
  | "backdrop"
  | "banner"
  | "logo"
  | "episode_still"
  | "cast"
  | "promo"
  | "intro"
  | "reunion"
  | "other";

type ImportMode = "standard" | "season_announcement";

const IMAGE_KIND_OPTIONS: Array<{ value: ImageKind; label: string }> = [
  { value: "poster", label: "Poster" },
  { value: "backdrop", label: "Backdrop" },
  { value: "banner", label: "Banner" },
  { value: "logo", label: "Logo" },
  { value: "episode_still", label: "Episode Still" },
  { value: "cast", label: "Cast Photos" },
  { value: "promo", label: "Promo" },
  { value: "intro", label: "Intro" },
  { value: "reunion", label: "Reunion" },
  { value: "other", label: "Other" },
];

type LogoTargetType =
  | "show"
  | "network"
  | "streaming"
  | "production"
  | "franchise"
  | "publication"
  | "social"
  | "other";

const LOGO_TARGET_OPTIONS: Array<{ value: LogoTargetType; label: string }> = [
  { value: "show", label: "Show" },
  { value: "network", label: "Network" },
  { value: "streaming", label: "Streaming" },
  { value: "production", label: "Production" },
  { value: "franchise", label: "Franchise" },
  { value: "publication", label: "Publication / News" },
  { value: "social", label: "Social" },
  { value: "other", label: "Other" },
];

interface LogoTargetSuggestion {
  target_type: LogoTargetType;
  target_key: string;
  target_label: string;
}

interface LogoTargetSelection {
  logo_target_type: LogoTargetType | "";
  logo_target_key: string;
  logo_target_label: string;
  logo_set_primary: boolean;
  search_query: string;
}

const GROUP_PICTURE_OPTION_VALUE = "__group_picture_full_time__";
const BRAND_LOGO_ROUTING_V2_ENABLED =
  (process.env.NEXT_PUBLIC_BRAND_LOGO_ROUTING_V2 ?? "true").toLowerCase() !== "false";

const resolveSeasonAnnouncementGroupKind = (image: {
  width?: number | null;
  height?: number | null;
}): ImageKind => {
  const width = typeof image.width === "number" ? image.width : 0;
  const height = typeof image.height === "number" ? image.height : 0;
  if (width > 0 && height > 0) {
    return width >= height ? "banner" : "poster";
  }
  return "poster";
};

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
  const [importMode, setImportMode] = useState<ImportMode>("standard");

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

  // Cast/logo tagging
  const [castOptions, setCastOptions] = useState<CastDropdownOption[]>([]);
  const [castOptionsLoading, setCastOptionsLoading] = useState(false);
  const [seasonCastFallbackUsed, setSeasonCastFallbackUsed] = useState(false);
  const [castSelectionByImage, setCastSelectionByImage] = useState<Record<string, string>>({});
  const [logoTargetsByImage, setLogoTargetsByImage] = useState<Record<string, LogoTargetSelection>>({});
  const [logoTargetSuggestionsByImage, setLogoTargetSuggestionsByImage] = useState<
    Record<string, LogoTargetSuggestion[]>
  >({});
  const [bulkLogoTargetType, setBulkLogoTargetType] = useState<LogoTargetType | "">("");
  const [bulkLogoTargetKey, setBulkLogoTargetKey] = useState("");
  const [bulkLogoTargetLabel, setBulkLogoTargetLabel] = useState("");
  const [bulkLogoSetPrimary, setBulkLogoSetPrimary] = useState(false);

  // Map of image candidate ID -> image kind
  const [imageKinds, setImageKinds] = useState<Record<string, ImageKind>>({});
  const [selectedShowSeason, setSelectedShowSeason] = useState<string>("na");

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Get auth headers
  const getAuthHeaders = useCallback(async () => getClientAuthHeaders(), []);

  const fetchWithAuth = useCallback(
    (input: RequestInfo | URL, init?: RequestInit) => fetchAdminWithAuth(input, init),
    [],
  );

  const isFriendRole = useCallback((role: string | null | undefined): boolean => {
    const normalized = (role ?? "").toLowerCase();
    return normalized.includes("friend");
  }, []);

  const resolveTargetSeasonNumber = useCallback((): number | null => {
    if (entityContext.type === "season") return entityContext.seasonNumber;
    if (entityContext.type === "show" && selectedShowSeason !== "na") {
      const parsed = Number.parseInt(selectedShowSeason, 10);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  }, [entityContext, selectedShowSeason]);

  const resolveTargetSeasonId = useCallback(async (): Promise<string | null> => {
    if (entityContext.type === "season") {
      return entityContext.seasonId ?? null;
    }
    if (entityContext.type !== "show") return null;
    const targetSeason = resolveTargetSeasonNumber();
    if (targetSeason === null) return null;

    const selected = (entityContext.seasons ?? []).find((season) => season.seasonNumber === targetSeason);
    if (selected?.seasonId) return selected.seasonId;

    try {
      const headers = await getAuthHeaders();
      const seasonsResponse = await fetchWithAuth(`/api/admin/trr-api/shows/${entityContext.showId}/seasons?limit=500`, {
        headers,
      });
      if (!seasonsResponse.ok) return null;
      const seasonsData = (await seasonsResponse.json().catch(() => ({}))) as {
        seasons?: Array<{ id?: string; season_number?: number | null }>;
      };
      const rows = Array.isArray(seasonsData.seasons) ? seasonsData.seasons : [];
      const match = rows.find((row) => Number(row.season_number) === targetSeason);
      return typeof match?.id === "string" && match.id ? match.id : null;
    } catch {
      return null;
    }
  }, [entityContext, fetchWithAuth, getAuthHeaders, resolveTargetSeasonNumber]);

  const loadCastOptions = useCallback(async () => {
    if (entityContext.type === "person") {
      setCastOptions([]);
      setSeasonCastFallbackUsed(false);
      return;
    }

    const targetSeason = resolveTargetSeasonNumber();
    if (entityContext.type === "show" && targetSeason === null) {
      setCastOptions([]);
      setSeasonCastFallbackUsed(false);
      return;
    }

    try {
      setCastOptionsLoading(true);
      const headers = await getAuthHeaders();
      const seasonId = await resolveTargetSeasonId();
      if (!seasonId) {
        setCastOptions([]);
        setSeasonCastFallbackUsed(false);
        return;
      }


      const showCastPromise = fetchWithAuth(`/api/admin/trr-api/shows/${entityContext.showId}/cast?limit=500`, { headers });
      const seasonCastPromise =
        targetSeason !== null
          ? fetchWithAuth(
              `/api/admin/trr-api/shows/${entityContext.showId}/seasons/${targetSeason}/cast?limit=500`,
              { headers }
            )
          : null;
      const seasonEpisodesPromise = fetchWithAuth(`/api/admin/trr-api/seasons/${seasonId}/episodes?limit=500`, {
        headers,
      });

      const [showCastResponse, seasonCastResponse, seasonEpisodesResponse] = await Promise.all([
        showCastPromise,
        seasonCastPromise,
        seasonEpisodesPromise,
      ]);
      if (!showCastResponse.ok) throw new Error("Failed to load cast roles");
      if (seasonCastResponse && !seasonCastResponse.ok) throw new Error("Failed to load season cast");
      if (!seasonEpisodesResponse.ok) throw new Error("Failed to load season episodes");

      const showCastData = (await showCastResponse.json().catch(() => ({}))) as {
        cast?: ShowCastMemberApi[];
      };
      const seasonCastData = seasonCastResponse
        ? ((await seasonCastResponse.json().catch(() => ({}))) as {
            cast?: SeasonCastMemberApi[];
            cast_source?: SeasonCastSource;
          })
        : { cast: undefined };
      const seasonEpisodesData = (await seasonEpisodesResponse.json().catch(() => ({}))) as {
        episodes?: Array<{ id?: string }>;
      };

      const showCastRows = Array.isArray(showCastData.cast) ? showCastData.cast : [];
      const seasonCastRows = Array.isArray(seasonCastData.cast) ? seasonCastData.cast : [];
      const usingSeasonFallback = seasonCastData.cast_source === "show_fallback";
      setSeasonCastFallbackUsed(usingSeasonFallback);
      const seasonEpisodeCount = Array.isArray(seasonEpisodesData.episodes)
        ? seasonEpisodesData.episodes.length
        : 0;
      if (seasonEpisodeCount <= 0 && !usingSeasonFallback) {
        setCastOptions([]);
        return;
      }

      const eligibleSeasonRows = usingSeasonFallback
        ? seasonCastRows.filter((row) => Boolean(row.person_id))
        : seasonCastRows.filter((row) => {
            const episodesInSeason =
              typeof row.episodes_in_season === "number" ? row.episodes_in_season : 0;
            return episodesInSeason > seasonEpisodeCount / 2;
          });
      const eligibleIds = new Set(eligibleSeasonRows.map((row) => row.person_id).filter(Boolean));

      const filteredShowCast =
        targetSeason !== null ? showCastRows.filter((row) => eligibleIds.has(row.person_id)) : showCastRows;

      let entries = filteredShowCast
        .map((row) => {
          const personId = row.person_id;
          const name = (row.full_name ?? row.cast_member_name ?? "").trim();
          if (!personId || !name) return null;
          const friend = isFriendRole(row.role ?? null);
          return {
            value: personId,
            label: `${name}${friend ? " (Friend)" : " (Full-time)"}`,
            matchName: name,
            personIds: [personId],
            isFriend: friend,
          } as CastDropdownOption;
        })
        .filter((row): row is CastDropdownOption => row !== null)
        .sort((a, b) => {
          if (a.isFriend !== b.isFriend) return a.isFriend ? 1 : -1;
          return a.label.localeCompare(b.label);
        });

      if (entries.length === 0 && eligibleSeasonRows.length > 0) {
        entries = eligibleSeasonRows
          .map((row) => {
            const personId = row.person_id;
            const name = (row.person_name ?? "").trim();
            if (!personId || !name) return null;
            return {
              value: personId,
              label: `${name} (Full-time)`,
              matchName: name,
              personIds: [personId],
              isFriend: false,
            } as CastDropdownOption;
          })
          .filter((row): row is CastDropdownOption => row !== null)
          .sort((a, b) => a.label.localeCompare(b.label));
      }

      const fullTimeIds = entries.filter((row) => !row.isFriend).map((row) => row.value);
      if (fullTimeIds.length > 0) {
        entries.unshift({
          value: GROUP_PICTURE_OPTION_VALUE,
          label: "Group Picture (All Full-time)",
          matchName: "",
          personIds: fullTimeIds,
          isFriend: false,
        });
      }

      setCastOptions(entries);
    } catch (err) {
      console.error("Failed to load cast options for image import:", err);
      setCastOptions([]);
      setSeasonCastFallbackUsed(false);
    } finally {
      setCastOptionsLoading(false);
    }
  }, [entityContext, fetchWithAuth, getAuthHeaders, isFriendRole, resolveTargetSeasonId, resolveTargetSeasonNumber]);

  const autoFillCastFromContext = useCallback(
    (imageIds: Iterable<string>) => {
      if (!previewData) return;
      if (castOptions.length === 0) return;

      const imagesById = new Map(previewData.images.map((img) => [img.id, img]));
      const captionUpdates: Record<string, string> = {};
      const assignmentUpdates: Record<string, string> = {};
      const castByNormalizedName = new Map<string, CastDropdownOption>();
      for (const option of castOptions) {
        if (option.value === GROUP_PICTURE_OPTION_VALUE) continue;
        const normalized = normalizePersonName(option.matchName);
        if (normalized && !castByNormalizedName.has(normalized)) {
          castByNormalizedName.set(normalized, option);
        }
      }

      for (const id of imageIds) {
        const img = imagesById.get(id);
        if (!img) continue;
        const parsed = parseCastContext({ context: img.context, alt_text: img.alt_text });
        if (parsed.caption) {
          captionUpdates[id] = parsed.caption;
        }
        if (parsed.name) {
          const normalized = normalizePersonName(parsed.name);
          const matched = castByNormalizedName.get(normalized);
          if (matched) {
            assignmentUpdates[id] = matched.value;
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
        setCastSelectionByImage((prev) => {
          const next = { ...prev };
          for (const [id, value] of Object.entries(assignmentUpdates)) {
            if (!next[id]) next[id] = value;
          }
          return next;
        });
      }
    },
    [previewData, castOptions]
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
            : entityContext.type === "person"
              ? entityContext.personId
              : entityContext.showId;

        if (entityContext.type === "season" && !entityId) {
          throw new Error("Missing seasonId for season import context");
        }
        const sourceUrl = url.trim() || null;
        const sourceDomain = extractDomain(sourceUrl);
        const selectedSeason =
          entityContext.type === "show" && selectedShowSeason !== "na"
            ? (entityContext.seasons ?? []).find(
                (s) => s.seasonNumber === Number.parseInt(selectedShowSeason, 10)
              )
            : null;

        const response = await fetchWithAuth("/api/admin/trr-api/media-links", {
          method: "POST",
          headers: {
            ...headers,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            media_asset_id: duplicate.media_asset_id,
            entity_type:
              entityType === "season"
                ? "season"
                : entityType === "show"
                  ? "show"
                  : "person",
            entity_id: entityId,
            kind: entityType === "person" ? "gallery" : duplicate.kind || "other",
            context:
              entityContext.type === "season"
                ? {
                    show_id: entityContext.showId,
                    season_number: entityContext.seasonNumber,
                    ...(sourceUrl ? { source_url: sourceUrl, source_page_url: sourceUrl } : {}),
                    ...(sourceDomain ? { source_domain: sourceDomain } : {}),
                  }
                : entityContext.type === "show"
                  ? {
                      show_id: entityContext.showId,
                      ...(selectedSeason
                        ? {
                            season_number: selectedSeason.seasonNumber,
                            ...(selectedSeason.seasonId
                              ? { season_id: selectedSeason.seasonId }
                              : {}),
                          }
                        : {}),
                      ...(sourceUrl ? { source_url: sourceUrl, source_page_url: sourceUrl } : {}),
                      ...(sourceDomain ? { source_domain: sourceDomain } : {}),
                    }
                : {
                    ...(sourceUrl ? { source_url: sourceUrl, source_page_url: sourceUrl } : {}),
                    ...(sourceDomain ? { source_domain: sourceDomain } : {}),
                  },
          }),
        });

        if (!response.ok) {
          let errorData: { error?: string } = {};
          try {
            errorData = (await response.json()) as { error?: string };
          } catch {
            // ignore parse failure and use generic message below
          }
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
        setError(err instanceof Error ? err.message : "Failed to link image");
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
    [entityContext, fetchWithAuth, getAuthHeaders, selectedShowSeason, url]
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
      setImportMode("standard");
      setPreviewData(null);
      setSelectedImages(new Set());
      setCaptions({});
      setCastSelectionByImage({});
      setImageKinds({});
      setLogoTargetsByImage({});
      setLogoTargetSuggestionsByImage({});
      setBulkLogoTargetType("");
      setBulkLogoTargetKey("");
      setBulkLogoTargetLabel("");
      setBulkLogoSetPrimary(false);
      setCastOptions([]);
      setSeasonCastFallbackUsed(false);
      setSelectedShowSeason("na");
      setImportProgress(null);
      setImportResult(null);
      setDuplicates([]);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (entityContext.type === "show") {
      const defaultSeason = entityContext.defaultSeasonNumber;
      if (typeof defaultSeason === "number" && Number.isFinite(defaultSeason)) {
        setSelectedShowSeason(String(defaultSeason));
      } else {
        setSelectedShowSeason("na");
      }
    } else {
      setSelectedShowSeason("na");
    }
  }, [isOpen, entityContext]);

  useEffect(() => {
    if (!isOpen) return;
    if (entityContext.type === "person") return;
    void loadCastOptions();
  }, [entityContext, isOpen, loadCastOptions, selectedShowSeason]);

  useEffect(() => {
    if (castOptions.length === 0) {
      setCastSelectionByImage({});
      return;
    }
    const validValues = new Set(castOptions.map((option) => option.value));
    setCastSelectionByImage((prev) => {
      const next: Record<string, string> = {};
      for (const [imageId, selection] of Object.entries(prev)) {
        if (validValues.has(selection)) {
          next[imageId] = selection;
        }
      }
      return next;
    });
  }, [castOptions]);


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
      setCastSelectionByImage({});
      setImageKinds({});
      setLogoTargetsByImage({});
      setLogoTargetSuggestionsByImage({});
      setBulkLogoTargetType("");
      setBulkLogoTargetKey("");
      setBulkLogoTargetLabel("");
      setBulkLogoSetPrimary(false);
      setImportResult(null);

      const headers = await getAuthHeaders();
      const previewPayload: Record<string, unknown> = { url: url.trim() };
      if (entityContext.type === "season" && entityContext.seasonId) {
        previewPayload.entity_type = "season";
        previewPayload.entity_id = entityContext.seasonId;
      }
      if (entityContext.type === "show") {
        previewPayload.entity_type = "show";
        previewPayload.entity_id = entityContext.showId;
      }
      if (entityContext.type === "person") {
        previewPayload.entity_type = "person";
        previewPayload.entity_id = entityContext.personId;
      }
      const response = await fetchWithAuth("/api/admin/scrape/preview", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(previewPayload),
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

  const resolveCastPersonIds = useCallback(
    (imageId: string): string[] => {
      const selectionValue = castSelectionByImage[imageId];
      if (!selectionValue) return [];
      const matched = castOptions.find((option) => option.value === selectionValue);
      return matched ? matched.personIds : [];
    },
    [castOptions, castSelectionByImage]
  );

  const inferCastPersonIdsFromCaption = useCallback(
    (caption: string | null | undefined): string[] => {
      const normalizedCaption = normalizePersonName(caption ?? "");
      if (!normalizedCaption) return [];
      const matchedIds = new Set<string>();
      for (const option of castOptions) {
        if (option.value === GROUP_PICTURE_OPTION_VALUE) continue;
        const normalizedName = normalizePersonName(option.matchName);
        if (!normalizedName) continue;
        if (normalizedCaption.includes(normalizedName)) {
          for (const personId of option.personIds) {
            matchedIds.add(personId);
          }
        }
      }
      return [...matchedIds];
    },
    [castOptions]
  );

  const sourceDomain = extractDomain(url.trim());

  const resolveShowLogoTarget = useCallback((): { key: string; label: string } => {
    if (entityContext.type === "season") {
      return { key: entityContext.showId, label: entityContext.showName };
    }
    if (entityContext.type === "show") {
      return { key: entityContext.showId, label: entityContext.showName };
    }
    return { key: "", label: "" };
  }, [entityContext]);

  const buildDefaultLogoTargetSelection = useCallback(
    (targetType: LogoTargetType | ""): LogoTargetSelection => {
      if (targetType === "show") {
        const showTarget = resolveShowLogoTarget();
        return {
          logo_target_type: "show",
          logo_target_key: showTarget.key,
          logo_target_label: showTarget.label,
          logo_set_primary: false,
          search_query: "",
        };
      }
      if (targetType === "publication") {
        const domain = sourceDomain ?? "";
        return {
          logo_target_type: "publication",
          logo_target_key: domain,
          logo_target_label: domain,
          logo_set_primary: false,
          search_query: "",
        };
      }
      return {
        logo_target_type: targetType,
        logo_target_key: "",
        logo_target_label: "",
        logo_set_primary: false,
        search_query: "",
      };
    },
    [resolveShowLogoTarget, sourceDomain]
  );

  const upsertLogoTargetByImage = useCallback(
    (imageId: string, patch: Partial<LogoTargetSelection>) => {
      setLogoTargetsByImage((prev) => {
        const current = prev[imageId] ?? buildDefaultLogoTargetSelection("");
        const next: LogoTargetSelection = { ...current, ...patch };
        if (patch.logo_target_type !== undefined) {
          if (patch.logo_target_type === "show") {
            const showTarget = resolveShowLogoTarget();
            next.logo_target_key = showTarget.key;
            next.logo_target_label = showTarget.label;
            next.search_query = "";
          } else if (patch.logo_target_type === "publication") {
            const domain = sourceDomain ?? "";
            if (!next.logo_target_key) next.logo_target_key = domain;
            if (!next.logo_target_label) next.logo_target_label = domain;
          } else if (patch.logo_target_type === "other") {
            next.search_query = "";
          }
        }
        return { ...prev, [imageId]: next };
      });
    },
    [buildDefaultLogoTargetSelection, resolveShowLogoTarget, sourceDomain]
  );

  const fetchLogoTargetSuggestions = useCallback(
    async (imageId: string, targetType: LogoTargetType, query: string) => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetchWithAuth(
          `/api/admin/trr-api/brands/logo-targets?target_type=${encodeURIComponent(targetType)}&q=${encodeURIComponent(query)}&limit=25`,
          { headers, cache: "no-store" }
        );
        if (!response.ok) return;
        const payload = (await response.json().catch(() => ({}))) as { rows?: LogoTargetSuggestion[] };
        const rows = Array.isArray(payload.rows) ? payload.rows : [];
        setLogoTargetSuggestionsByImage((prev) => ({ ...prev, [imageId]: rows }));
      } catch {
        // Ignore suggestion lookup failures; manual key/label entry still works.
      }
    },
    [fetchWithAuth, getAuthHeaders]
  );

  const isLogoTargetSelectionValid = useCallback(
    (selection: LogoTargetSelection | undefined): boolean => {
      if (!BRAND_LOGO_ROUTING_V2_ENABLED) return true;
      if (!selection) return false;
      if (!selection.logo_target_type) return false;
      if (!selection.logo_target_key.trim()) return false;
      if (!selection.logo_target_label.trim()) return false;
      if (selection.logo_target_type === "show") {
        const showTarget = resolveShowLogoTarget();
        return Boolean(showTarget.key);
      }
      return true;
    },
    [resolveShowLogoTarget]
  );

  const logoSelectionValidationError = useCallback((): string | null => {
    if (!BRAND_LOGO_ROUTING_V2_ENABLED) return null;
    if (!previewData) return null;
    for (const img of previewData.images) {
      if (!selectedImages.has(img.id)) continue;
      const selectedKind = imageKinds[img.id] || "other";
      if (selectedKind !== "logo") continue;
      const selection = logoTargetsByImage[img.id];
      if (!isLogoTargetSelectionValid(selection)) {
        return "All selected logo images require a target type, key, and label.";
      }
    }
    return null;
  }, [imageKinds, isLogoTargetSelectionValid, logoTargetsByImage, previewData, selectedImages]);


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
    const logoValidationError = logoSelectionValidationError();
    if (logoValidationError) {
      setError(logoValidationError);
      return;
    }

    try {
      setError(null);
      setImporting(true);
      setImportProgress(null);
      setImportResult(null);

      const imagesToImport = previewData.images
        .filter((img) => selectedImages.has(img.id))
        .map((img) => {
          const selectedKind = imageKinds[img.id] || "other";
          const isSeasonAnnouncement =
            entityContext.type !== "person" && importMode === "season_announcement";
          const isGroupCastSelection =
            selectedKind === "cast" &&
            castSelectionByImage[img.id] === GROUP_PICTURE_OPTION_VALUE;
          const imageKind =
            isSeasonAnnouncement && isGroupCastSelection
              ? resolveSeasonAnnouncementGroupKind(img)
              : selectedKind;
          const explicitPersonIds = selectedKind === "cast" ? resolveCastPersonIds(img.id) : [];
          const autoPersonIds =
            selectedKind === "cast" &&
            importMode === "season_announcement" &&
            explicitPersonIds.length === 0
              ? inferCastPersonIdsFromCaption(captions[img.id] || img.alt_text || img.context || "")
              : [];
          const logoTarget = logoTargetsByImage[img.id];
          const logoTargetType = imageKind === "logo" ? logoTarget?.logo_target_type ?? "" : "";
          const legacySourceLogo =
            imageKind === "logo"
              ? logoTargetType === "show"
                ? "SHOW"
                : logoTargetType === "publication"
                  ? "SOURCE"
                  : null
              : null;
          return {
            candidate_id: img.id,
            url: img.best_url,
            caption: captions[img.id] || null,
            kind: imageKind,
            person_ids: explicitPersonIds.length > 0 ? explicitPersonIds : autoPersonIds,
            context_section:
              entityContext.type !== "person" && importMode === "season_announcement"
                ? "Cast Portraits"
                : null,
            context_type:
              entityContext.type !== "person" && importMode === "season_announcement"
                ? "OFFICIAL SEASON ANNOUNCEMENT"
                : null,
            source_logo: legacySourceLogo,
            logo_target_type: imageKind === "logo" ? logoTargetType || null : null,
            logo_target_key: imageKind === "logo" ? logoTarget?.logo_target_key?.trim() || null : null,
            logo_target_label: imageKind === "logo" ? logoTarget?.logo_target_label?.trim() || null : null,
            logo_set_primary: imageKind === "logo" ? Boolean(logoTarget?.logo_set_primary) : false,
            asset_name: null,
          };
        });

      const urlToKindMap = new Map<string, ImageKind>();
      for (const img of imagesToImport) {
        urlToKindMap.set(img.url, img.kind as ImageKind);
      }

      // Build payload based on entity context
      const selectedShowSeasonRow =
        entityContext.type === "show" && selectedShowSeason !== "na"
          ? (entityContext.seasons ?? []).find(
              (season) => season.seasonNumber === Number.parseInt(selectedShowSeason, 10)
            )
          : null;
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
          : entityContext.type === "show"
            ? {
                entity_type: "show" as const,
                show_id: entityContext.showId,
                ...(selectedShowSeasonRow
                  ? {
                      season_number: selectedShowSeasonRow.seasonNumber,
                      ...(selectedShowSeasonRow.seasonId
                        ? { season_id: selectedShowSeasonRow.seasonId }
                        : {}),
                    }
                  : {}),
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
      const response = await fetchWithAuth("/api/admin/scrape/import/stream", {
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
                data.status === "excluded" ||
                data.status === "error"
              ) {
                const mediaAssetId =
                  (typeof data.media_asset_id === "string" && data.media_asset_id) ||
                  (typeof data.asset_id === "string" && data.asset_id) ||
                  undefined;
                setImportProgress({
                  current: data.current,
                  total: data.total,
                  url: data.url,
                  status: data.status,
                  error: data.error,
                  media_asset_id: mediaAssetId,
                });

                // Track duplicates that have asset IDs for potential linking
                if (data.status === "duplicate" && mediaAssetId) {
                  const duplicateKind =
                    urlToKindMap.get(data.url) ?? "other";
                  setDuplicates((prev) => [
                    ...prev,
                    {
                      url: data.url,
                      media_asset_id: mediaAssetId,
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
      : entityContext.type === "show"
        ? `${entityContext.showName} - Main Media Gallery`
        : entityContext.personName;
  const imageKindOptions = IMAGE_KIND_OPTIONS;
  const selectedLogoImageIds =
    previewData?.images
      .filter((img) => selectedImages.has(img.id))
      .filter((img) => (imageKinds[img.id] || "other") === "logo")
      .map((img) => img.id) ?? [];

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
                  {entityContext.type === "show" && (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-semibold text-zinc-600">Season:</span>
                      <select
                        value={selectedShowSeason}
                        onChange={(e) => setSelectedShowSeason(e.target.value)}
                        className="rounded border border-zinc-200 px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none"
                      >
                        <option value="na">N/A</option>
                        {(entityContext.seasons ?? [])
                          .slice()
                          .sort((a, b) => a.seasonNumber - b.seasonNumber)
                          .map((season) => (
                            <option key={`${season.seasonId ?? season.seasonNumber}`} value={season.seasonNumber}>
                              Season {season.seasonNumber}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {entityContext.type !== "person" && (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-semibold text-zinc-600">
                        Import type:
                      </span>
                      <select
                        value={importMode}
                        onChange={(e) => {
                          const value = e.target.value as ImportMode;
                          setImportMode(value);
                        }}
                        className="rounded border border-zinc-200 px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none"
                      >
                        <option value="standard">Standard</option>
                        <option value="season_announcement">Season Announcement</option>
                      </select>
                      {importMode === "season_announcement" && (
                        <span className="text-xs text-zinc-500">
                          Uses OFFICIAL SEASON ANNOUNCEMENT metadata; cast photos can auto-tag by caption names.
                        </span>
                      )}
                    </div>
                  )}

                  {entityContext.type !== "person" && (
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
                            autoFillCastFromContext(selectedImages);
                          }
                          if (value === "logo" && BRAND_LOGO_ROUTING_V2_ENABLED) {
                            for (const imageId of selectedImages) {
                              setLogoTargetsByImage((prev) =>
                                prev[imageId] ? prev : { ...prev, [imageId]: buildDefaultLogoTargetSelection("") }
                              );
                            }
                          }
                          e.target.value = "";
                        }}
                        className="rounded border border-zinc-200 px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none"
                      >
                        <option value="">Select kind...</option>
                        {imageKindOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {BRAND_LOGO_ROUTING_V2_ENABLED && selectedLogoImageIds.length > 0 && (
                    <div className="grid gap-2 rounded border border-amber-200 bg-amber-50 p-2">
                      <span className="text-xs font-semibold text-amber-800">
                        Bulk logo classification ({selectedLogoImageIds.length} selected logos)
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={bulkLogoTargetType}
                          onChange={(e) => setBulkLogoTargetType(e.target.value as LogoTargetType | "")}
                          className="rounded border border-zinc-200 px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none"
                        >
                          <option value="">Target type...</option>
                          {LOGO_TARGET_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={bulkLogoTargetKey}
                          onChange={(e) => setBulkLogoTargetKey(e.target.value)}
                          placeholder="Target key"
                          className="min-w-[130px] rounded border border-zinc-200 px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none"
                        />
                        <input
                          type="text"
                          value={bulkLogoTargetLabel}
                          onChange={(e) => setBulkLogoTargetLabel(e.target.value)}
                          placeholder="Target label"
                          className="min-w-[130px] rounded border border-zinc-200 px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none"
                        />
                        <label className="flex items-center gap-1 text-xs text-zinc-700">
                          <input
                            type="checkbox"
                            checked={bulkLogoSetPrimary}
                            onChange={(e) => setBulkLogoSetPrimary(e.target.checked)}
                          />
                          Primary
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            for (const imageId of selectedLogoImageIds) {
                              if (!bulkLogoTargetType) continue;
                              upsertLogoTargetByImage(imageId, {
                                logo_target_type: bulkLogoTargetType,
                                logo_target_key: bulkLogoTargetKey,
                                logo_target_label: bulkLogoTargetLabel,
                                logo_set_primary: bulkLogoSetPrimary,
                              });
                            }
                          }}
                          disabled={!bulkLogoTargetType}
                          className="rounded bg-amber-600 px-2 py-1 text-xs font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  )}

                  {entityContext.type !== "person" && (
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs text-zinc-600">
                        {castOptionsLoading
                          ? "Loading season cast options..."
                          : seasonCastFallbackUsed && castOptions.length > 0
                            ? "Season episode evidence is unavailable. Using approximate show-level cast options."
                            : castOptions.length > 0
                            ? "Cast images include only members in more than half of season episodes. Group Picture tags all eligible Full-time."
                            : "No eligible cast for this season yet (must appear in more than half the episodes)."}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Image Grid */}
              <div className="mb-6 grid grid-cols-3 gap-3">
                {previewData.images.map((img) => {
                  const isSelected = selectedImages.has(img.id);
                  const selectedKind = imageKinds[img.id] || "other";
                  const logoSelection =
                    logoTargetsByImage[img.id] ?? buildDefaultLogoTargetSelection("");
                  const logoSuggestions = logoTargetSuggestionsByImage[img.id] ?? [];
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
                            value={selectedKind}
                            onChange={(e) => {
                              const value = e.target.value as ImageKind;
                              setImageKinds((prev) => ({ ...prev, [img.id]: value }));
                              if (value === "cast") {
                                autoFillCastFromContext([img.id]);
                              }
                              if (value === "logo" && BRAND_LOGO_ROUTING_V2_ENABLED) {
                                setLogoTargetsByImage((prev) =>
                                  prev[img.id] ? prev : { ...prev, [img.id]: buildDefaultLogoTargetSelection("") }
                                );
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full rounded border border-zinc-200 px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none"
                          >
                            {imageKindOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          {entityContext.type !== "person" && selectedKind === "cast" && (
                            <select
                              value={castSelectionByImage[img.id] ?? ""}
                              onChange={(e) =>
                                setCastSelectionByImage((prev) => ({
                                  ...prev,
                                  [img.id]: e.target.value,
                                }))
                              }
                              disabled={castOptionsLoading || castOptions.length === 0}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full rounded border border-zinc-200 px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none disabled:bg-zinc-100"
                            >
                              <option value="">
                                {castOptionsLoading ? "Loading cast..." : "Select cast member"}
                              </option>
                              {castOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          )}
                          {BRAND_LOGO_ROUTING_V2_ENABLED && selectedKind === "logo" && (
                            <div className="space-y-1 rounded border border-amber-200 bg-amber-50 p-2">
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                                Logo Target
                              </p>
                              <select
                                value={logoSelection.logo_target_type}
                                onChange={(e) =>
                                  upsertLogoTargetByImage(img.id, {
                                    logo_target_type: e.target.value as LogoTargetType | "",
                                  })
                                }
                                onClick={(e) => e.stopPropagation()}
                                className="w-full rounded border border-zinc-200 px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none"
                              >
                                <option value="">Select target...</option>
                                {LOGO_TARGET_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>

                              {logoSelection.logo_target_type &&
                                ["network", "streaming", "production", "franchise", "social"].includes(
                                  logoSelection.logo_target_type
                                ) && (
                                  <>
                                    <div className="flex gap-1">
                                      <input
                                        type="text"
                                        value={logoSelection.search_query}
                                        onChange={(e) =>
                                          upsertLogoTargetByImage(img.id, { search_query: e.target.value })
                                        }
                                        onClick={(e) => e.stopPropagation()}
                                        placeholder="Search targets..."
                                        className="min-w-0 flex-1 rounded border border-zinc-200 px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none"
                                      />
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const targetType = logoSelection.logo_target_type as LogoTargetType;
                                          void fetchLogoTargetSuggestions(img.id, targetType, logoSelection.search_query);
                                        }}
                                        className="rounded border border-zinc-300 px-2 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-100"
                                      >
                                        Search
                                      </button>
                                    </div>
                                    <select
                                      value={logoSelection.logo_target_key}
                                      onChange={(e) => {
                                        const nextKey = e.target.value;
                                        const matched = logoSuggestions.find(
                                          (suggestion) => suggestion.target_key === nextKey
                                        );
                                        upsertLogoTargetByImage(img.id, {
                                          logo_target_key: nextKey,
                                          logo_target_label: matched?.target_label ?? logoSelection.logo_target_label,
                                        });
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="w-full rounded border border-zinc-200 px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none"
                                    >
                                      <option value="">Select target...</option>
                                      {logoSuggestions.map((suggestion) => (
                                        <option key={`${suggestion.target_type}:${suggestion.target_key}`} value={suggestion.target_key}>
                                          {suggestion.target_label}
                                        </option>
                                      ))}
                                    </select>
                                  </>
                                )}

                              <input
                                type="text"
                                value={logoSelection.logo_target_key}
                                onChange={(e) =>
                                  upsertLogoTargetByImage(img.id, { logo_target_key: e.target.value })
                                }
                                onClick={(e) => e.stopPropagation()}
                                placeholder="Target key"
                                disabled={logoSelection.logo_target_type === "show" && entityContext.type === "show"}
                                className="w-full rounded border border-zinc-200 px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none disabled:bg-zinc-100"
                              />
                              <input
                                type="text"
                                value={logoSelection.logo_target_label}
                                onChange={(e) =>
                                  upsertLogoTargetByImage(img.id, { logo_target_label: e.target.value })
                                }
                                onClick={(e) => e.stopPropagation()}
                                placeholder="Target label"
                                disabled={logoSelection.logo_target_type === "show" && entityContext.type === "show"}
                                className="w-full rounded border border-zinc-200 px-2 py-1 text-xs focus:border-zinc-400 focus:outline-none disabled:bg-zinc-100"
                              />
                              <label className="flex items-center gap-2 text-[11px] text-zinc-700">
                                <input
                                  type="checkbox"
                                  checked={logoSelection.logo_set_primary}
                                  onChange={(e) =>
                                    upsertLogoTargetByImage(img.id, { logo_set_primary: e.target.checked })
                                  }
                                  onClick={(e) => e.stopPropagation()}
                                />
                                Set as primary
                              </label>
                            </div>
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
                          : importProgress.status === "excluded"
                          ? "bg-zinc-100 text-zinc-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {importProgress.status === "downloading" && "Downloading..."}
                      {importProgress.status === "success" && "Imported"}
                      {importProgress.status === "duplicate" && "Duplicate"}
                      {importProgress.status === "excluded" && "Excluded"}
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
                          : importProgress.status === "excluded"
                          ? "bg-zinc-500"
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
                disabled={importing || selectedImages.size === 0 || Boolean(logoSelectionValidationError())}
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
              {logoSelectionValidationError() ? (
                <p className="mt-2 text-xs text-amber-700">{logoSelectionValidationError()}</p>
              ) : null}
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
