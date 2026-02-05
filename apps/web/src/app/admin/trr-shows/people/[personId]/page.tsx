"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ClientOnly from "@/components/ClientOnly";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { auth } from "@/lib/firebase";
import { ExternalLinks, TmdbLinkIcon, ImdbLinkIcon } from "@/components/admin/ExternalLinks";
import { ImageLightbox } from "@/components/admin/ImageLightbox";
import { ImageScrapeDrawer, type PersonContext } from "@/components/admin/ImageScrapeDrawer";
import { mapPhotoToMetadata } from "@/lib/photo-metadata";

// Types
interface TrrPerson {
  id: string;
  full_name: string;
  known_for: string | null;
  external_ids: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface TrrPersonPhoto {
  id: string;
  person_id: string;
  source: string;
  url: string | null;
  hosted_url: string | null;
  hosted_content_type?: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  context_section: string | null;
  context_type: string | null;
  season: number | null;
  // Metadata fields for lightbox display
  people_names: string[] | null;
  people_ids: string[] | null;
  people_count?: number | null;
  people_count_source?: "auto" | "manual" | null;
  ingest_status?: string | null;
  title_names: string[] | null;
  metadata: Record<string, unknown> | null;
  fetched_at: string | null;
  created_at: string | null;
  // Origin metadata
  origin: "cast_photos" | "media_links";
  link_id?: string | null;
  media_asset_id?: string | null;
}

type GallerySortOption = "newest" | "oldest" | "source" | "season-asc" | "season-desc";
type GalleryShowFilter = "all" | "this-show" | "other-shows";

interface TrrPersonCredit {
  id: string;
  show_id: string;
  person_id: string;
  show_name: string | null;
  role: string | null;
  billing_order: number | null;
  credit_category: string;
}

interface CoverPhoto {
  person_id: string;
  photo_id: string;
  photo_url: string;
}

interface TrrCastFandom {
  id: string;
  person_id: string;
  source: string;
  source_url: string;
  page_title: string | null;
  scraped_at: string;
  full_name: string | null;
  birthdate: string | null;
  birthdate_display: string | null;
  gender: string | null;
  resides_in: string | null;
  hair_color: string | null;
  eye_color: string | null;
  height_display: string | null;
  weight_display: string | null;
  romances: string[] | null;
  family: Record<string, unknown> | null;
  friends: Record<string, unknown> | null;
  enemies: Record<string, unknown> | null;
  installment: string | null;
  installment_url: string | null;
  main_seasons_display: string | null;
  summary: string | null;
  taglines: Record<string, unknown> | null;
  reunion_seating: Record<string, unknown> | null;
  trivia: Record<string, unknown> | null;
}

type TabId = "overview" | "gallery" | "credits" | "fandom";

const parsePeopleCount = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const formatRefreshSummary = (summary: unknown): string | null => {
  if (typeof summary === "string") return summary;
  if (summary && typeof summary === "object") {
    const parts = Object.entries(summary as Record<string, unknown>)
      .filter(([, value]) => typeof value === "number")
      .map(([key, value]) => `${key.replace(/_/g, " ")}: ${value}`);
    return parts.length > 0 ? parts.join(", ") : null;
  }
  return null;
};

const SHOW_ACRONYM_RE = /\bRH[A-Z0-9]{2,6}\b/g;

const buildShowAcronym = (name: string | null | undefined): string | null => {
  if (!name) return null;
  const words = name
    .replace(/[^a-z0-9 ]/gi, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return null;
  const filtered = words.filter(
    (word) => !["the", "and", "a", "an", "to", "for"].includes(word.toLowerCase())
  );
  const acronym = (filtered.length > 0 ? filtered : words)
    .map((word) => word[0]?.toUpperCase?.() ?? "")
    .join("");
  return acronym || null;
};

const extractShowAcronyms = (text: string): Set<string> => {
  const matches = text.toUpperCase().match(SHOW_ACRONYM_RE) ?? [];
  return new Set(matches);
};

// Profile photo with error handling
function ProfilePhoto({ url, name }: { url: string | null | undefined; name: string }) {
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | null>(url ?? null);

  useEffect(() => {
    setHasError(false);
    setCurrentSrc(url ?? null);
  }, [url]);

  if (!currentSrc || hasError) {
    return (
      <div className="relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-xl bg-zinc-200">
        <div className="flex h-full items-center justify-center text-zinc-400">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
            <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-xl bg-zinc-200">
      <Image
        src={currentSrc}
        alt={name}
        fill
        className="object-cover"
        sizes="128px"
        unoptimized
        onError={() => setHasError(true)}
      />
    </div>
  );
}

function RefreshProgressBar({
  show,
  current,
  total,
}: {
  show: boolean;
  current?: number | null;
  total?: number | null;
}) {
  if (!show) return null;
  const hasProgress =
    typeof current === "number" &&
    typeof total === "number" &&
    total > 0 &&
    current >= 0;
  const percent = hasProgress
    ? Math.min(100, Math.round((current / total) * 100))
    : 0;

  return (
    <div className="w-full">
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
        {hasProgress ? (
          <div
            className="h-full rounded-full bg-zinc-700 transition-all"
            style={{ width: `${percent}%` }}
          />
        ) : (
          <div className="absolute inset-y-0 left-0 w-1/3 animate-pulse rounded-full bg-zinc-700/70" />
        )}
      </div>
      {hasProgress && (
        <p className="mt-1 text-[11px] text-zinc-500">
          {current}/{total}
        </p>
      )}
    </div>
  );
}

// Photo with error handling
function GalleryPhoto({
  photo,
  onClick,
  isCover,
  onSetCover,
  settingCover,
}: {
  photo: TrrPersonPhoto;
  onClick: () => void;
  isCover?: boolean;
  onSetCover?: () => void;
  settingCover?: boolean;
}) {
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | null>(photo.hosted_url || photo.url || null);
  const triedFallbackRef = useRef(false);

  useEffect(() => {
    setHasError(false);
    triedFallbackRef.current = false;
    setCurrentSrc(photo.hosted_url || photo.url || null);
  }, [photo.hosted_url, photo.url]);

  const handleError = () => {
    if (!triedFallbackRef.current && photo.url && currentSrc !== photo.url) {
      triedFallbackRef.current = true;
      setCurrentSrc(photo.url);
      return;
    }
    setHasError(true);
  };

  if (hasError || !currentSrc) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-200 text-zinc-400">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
          <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
          <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" />
        </svg>
      </div>
    );
  }

  return (
    <>
      <Image
        src={currentSrc}
        alt={photo.caption || "Photo"}
        fill
        className="object-cover cursor-zoom-in transition hover:scale-105"
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
        unoptimized
        onClick={onClick}
        onError={handleError}
      />
      {/* Cover badge */}
      {isCover && (
        <div className="absolute top-2 left-2 z-10 rounded-full bg-green-500 px-2 py-0.5 text-xs font-semibold text-white shadow">
          Cover
        </div>
      )}
      {/* Set as Cover button */}
      {onSetCover && !isCover && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSetCover();
          }}
          disabled={settingCover}
          className="absolute bottom-2 right-2 z-10 rounded-lg bg-black/70 px-2 py-1 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100 hover:bg-black disabled:opacity-50"
        >
          {settingCover ? "..." : "Set as Cover"}
        </button>
      )}
    </>
  );
}

type TagPerson = { id?: string; name: string };

function TagPeoplePanel({
  photo,
  getAuthHeaders,
  onTagsUpdated,
  onMirrorUpdated,
}: {
  photo: TrrPersonPhoto;
  getAuthHeaders: () => Promise<{ Authorization: string }>;
  onTagsUpdated: (payload: {
    mediaAssetId: string | null;
    castPhotoId: string | null;
    peopleNames: string[];
    peopleIds: string[];
    peopleCount: number | null;
    peopleCountSource: "auto" | "manual" | null;
  }) => void;
  onMirrorUpdated: (payload: {
    mediaAssetId: string | null;
    castPhotoId: string | null;
    hostedUrl: string;
  }) => void;
}) {
  const isCastPhoto = photo.origin === "cast_photos";
  const isMediaLink = photo.origin === "media_links";
  const hasSourceTags =
    isCastPhoto &&
    (photo.people_names?.length ?? 0) > 0 &&
    photo.people_count_source !== "manual";
  const isEditable = (isMediaLink && Boolean(photo.link_id)) || (isCastPhoto && !hasSourceTags);
  const [taggedPeople, setTaggedPeople] = useState<TagPerson[]>([]);
  const [readonlyNames, setReadonlyNames] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TrrPerson[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [peopleCountInput, setPeopleCountInput] = useState<string>("");
  const [recounting, setRecounting] = useState(false);
  const [recountError, setRecountError] = useState<string | null>(null);
  const [mirroring, setMirroring] = useState(false);
  const [mirrorError, setMirrorError] = useState<string | null>(null);
  const currentPeopleCount = parsePeopleCount(photo.people_count);

  useEffect(() => {
    const ids = photo.people_ids ?? [];
    const names = photo.people_names ?? [];
    if (isEditable) {
      if (ids.length > 0) {
        setTaggedPeople(
          ids.map((id, i) => ({ id, name: names[i] ?? id }))
        );
      } else if (names.length > 0) {
        setTaggedPeople(names.map((name) => ({ name })));
      } else {
        setTaggedPeople([]);
      }
      setReadonlyNames([]);
    } else {
      setTaggedPeople([]);
      setReadonlyNames(names);
    }
    setPeopleCountInput(
      currentPeopleCount !== null && currentPeopleCount !== undefined
        ? String(currentPeopleCount)
        : ""
    );
  }, [photo.id, photo.people_ids, photo.people_names, currentPeopleCount, isEditable]);

  useEffect(() => {
    if (!isEditable) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const headers = await getAuthHeaders();
        const response = await fetch(
          `/api/admin/trr-api/people?q=${encodeURIComponent(trimmed)}&limit=8`,
          { headers }
        );
        if (!response.ok) {
          setResults([]);
          return;
        }
        const data = await response.json();
        setResults(data.people ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, isEditable, getAuthHeaders]);

  const updateTags = useCallback(
    async (nextPeople: TagPerson[], peopleCountOverride?: number | null) => {
      if (!isEditable) return;
      if (isMediaLink && !photo.link_id) return;
      setSaving(true);
      setError(null);
      try {
        const headers = await getAuthHeaders();
        const endpoint = isMediaLink
          ? `/api/admin/trr-api/media-links/${photo.link_id}/tags`
          : `/api/admin/trr-api/cast-photos/${photo.id}/tags`;
        const payload: Record<string, unknown> = { people: nextPeople };
        if (peopleCountOverride !== undefined) {
          payload.people_count = peopleCountOverride;
        }
        const response = await fetch(endpoint, {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || data.detail || "Failed to update tags");
        }
        const peopleNames = Array.isArray(data.people_names)
          ? (data.people_names as string[])
          : nextPeople.map((p) => p.name);
        const peopleIds = Array.isArray(data.people_ids)
          ? (data.people_ids as string[])
          : nextPeople.map((p) => p.id).filter(Boolean) as string[];
        const peopleCountFromResponse = parsePeopleCount(data.people_count);
        const peopleCount =
          peopleCountFromResponse !== null
            ? peopleCountFromResponse
            : peopleCountOverride ?? null;
        const hasManualInput =
          nextPeople.length > 0 ||
          (peopleCountOverride !== undefined && peopleCountOverride !== null);
        const fallbackSource = hasManualInput ? "manual" : null;
        const peopleCountSource =
          typeof data.people_count_source === "string"
            ? (data.people_count_source as "auto" | "manual")
            : fallbackSource;
        setTaggedPeople(nextPeople);
        setReadonlyNames([]);
        setPeopleCountInput(
          peopleCount !== null && peopleCount !== undefined
            ? String(peopleCount)
            : ""
        );
        onTagsUpdated({
          mediaAssetId: photo.media_asset_id ?? null,
          castPhotoId: isCastPhoto ? photo.id : null,
          peopleNames,
          peopleIds,
          peopleCount,
          peopleCountSource,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update tags");
      } finally {
        setSaving(false);
      }
    },
    [
      getAuthHeaders,
      isEditable,
      isMediaLink,
      isCastPhoto,
      onTagsUpdated,
      photo.id,
      photo.link_id,
      photo.media_asset_id,
    ]
  );

  const handleAddPerson = (person: TrrPerson) => {
    if (!person.id || !person.full_name) return;
    if (taggedPeople.some((p) => p.id === person.id)) return;
    const next = [...taggedPeople, { id: person.id, name: person.full_name }];
    setQuery("");
    setResults([]);
    void updateTags(next);
  };

  const handleAddFreeText = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    if (taggedPeople.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setQuery("");
      setResults([]);
      return;
    }
    const next = [...taggedPeople, { name: trimmed }];
    setQuery("");
    setResults([]);
    void updateTags(next);
  };

  const handleRemovePerson = (person: TagPerson) => {
    const next = taggedPeople.filter((p) => {
      if (person.id) return p.id !== person.id;
      return p.name.toLowerCase() !== person.name.toLowerCase();
    });
    void updateTags(next);
  };

  const displayTags =
    taggedPeople.length > 0 ? taggedPeople.map((p) => p.name) : readonlyNames;

  const normalizeCountInput = (value: string) => {
    const raw = value.trim();
    if (!raw) return null;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const isCountDirty =
    normalizeCountInput(peopleCountInput) !== currentPeopleCount;

  const handleSaveCount = () => {
    if (!isCountDirty) return;
    const raw = peopleCountInput.trim();
    if (!raw) {
      void updateTags(taggedPeople, null);
      return;
    }
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("People count must be a positive number.");
      return;
    }
    void updateTags(taggedPeople, parsed);
  };

  const canRecount =
    photo.people_count_source !== "manual" &&
    (isCastPhoto || Boolean(photo.media_asset_id));

  const canMirror = isMediaLink && Boolean(photo.media_asset_id);

  const mirrorForRecount = async () => {
    if (isMediaLink && photo.media_asset_id) {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/media-assets/${photo.media_asset_id}/mirror`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ force: true }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        const message =
          data.error && data.detail
            ? `${data.error}: ${data.detail}`
            : data.error || data.detail || "Failed to mirror image";
        throw new Error(message);
      }
      if (typeof data.hosted_url === "string") {
        onMirrorUpdated({
          mediaAssetId: photo.media_asset_id,
          castPhotoId: null,
          hostedUrl: data.hosted_url,
        });
      }
      return;
    }

    if (isCastPhoto) {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/cast-photos/${photo.id}/mirror`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ force: true }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        const message =
          data.error && data.detail
            ? `${data.error}: ${data.detail}`
            : data.error || data.detail || "Failed to mirror image";
        throw new Error(message);
      }
      if (typeof data.hosted_url === "string") {
        onMirrorUpdated({
          mediaAssetId: null,
          castPhotoId: photo.id,
          hostedUrl: data.hosted_url,
        });
      }
    }
  };

  const handleRecount = async () => {
    if (!canRecount) return;
    setRecounting(true);
    setRecountError(null);
    try {
      const runRecount = async () => {
        const headers = await getAuthHeaders();
        const endpoint = isCastPhoto
          ? `/api/admin/trr-api/cast-photos/${photo.id}/auto-count`
          : `/api/admin/trr-api/media-assets/${photo.media_asset_id}/auto-count`;
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ force: false }),
        });
        const data = await response.json();
        if (!response.ok) {
          const message =
            data.error && data.detail
              ? `${data.error}: ${data.detail}`
              : data.error || data.detail || "Failed to auto-count people";
          throw new Error(message);
        }
        return data;
      };

      const applyRecount = (data: Record<string, unknown>) => {
        const peopleCount = parsePeopleCount(data.people_count);
        const peopleCountSource =
          (data.people_count_source as "auto" | "manual" | null) ?? "auto";
        setPeopleCountInput(
          peopleCount !== null && peopleCount !== undefined
            ? String(peopleCount)
            : ""
        );
        onTagsUpdated({
          mediaAssetId: photo.media_asset_id ?? null,
          castPhotoId: isCastPhoto ? photo.id : null,
          peopleNames: photo.people_names ?? [],
          peopleIds: photo.people_ids ?? [],
          peopleCount,
          peopleCountSource,
        });
      };

      const data = await runRecount();
      applyRecount(data);
    } catch (err) {
      try {
        setMirroring(true);
        await mirrorForRecount();
        const retryData = await (async () => {
          const headers = await getAuthHeaders();
          const endpoint = isCastPhoto
            ? `/api/admin/trr-api/cast-photos/${photo.id}/auto-count`
            : `/api/admin/trr-api/media-assets/${photo.media_asset_id}/auto-count`;
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ force: false }),
          });
          const data = await response.json();
          if (!response.ok) {
            const message =
              data.error && data.detail
                ? `${data.error}: ${data.detail}`
                : data.error || data.detail || "Failed to auto-count people";
            throw new Error(message);
          }
          return data;
        })();

        const peopleCount = parsePeopleCount(retryData.people_count);
        const peopleCountSource =
          (retryData.people_count_source as "auto" | "manual" | null) ?? "auto";
        setPeopleCountInput(
          peopleCount !== null && peopleCount !== undefined
            ? String(peopleCount)
            : ""
        );
        onTagsUpdated({
          mediaAssetId: photo.media_asset_id ?? null,
          castPhotoId: isCastPhoto ? photo.id : null,
          peopleNames: photo.people_names ?? [],
          peopleIds: photo.people_ids ?? [],
          peopleCount,
          peopleCountSource,
        });
        setRecountError(null);
      } catch (mirrorErr) {
        setRecountError(
          mirrorErr instanceof Error ? mirrorErr.message : "Failed to auto-count people"
        );
      } finally {
        setMirroring(false);
      }
      if (!canRecount) {
        setRecountError(err instanceof Error ? err.message : "Failed to auto-count people");
      }
    } finally {
      setRecounting(false);
    }
  };

  const handleMirror = async () => {
    if (!canMirror || !photo.media_asset_id) return;
    setMirroring(true);
    setMirrorError(null);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/media-assets/${photo.media_asset_id}/mirror`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ force: true }),
        }
      );
      const data = await response.json();
      if (!response.ok) {
        const message =
          data.error && data.detail
            ? `${data.error}: ${data.detail}`
            : data.error || data.detail || "Failed to mirror image";
        throw new Error(message);
      }
      const hostedUrl =
        typeof data.hosted_url === "string" ? data.hosted_url : null;
      if (hostedUrl) {
        onMirrorUpdated({
          mediaAssetId: photo.media_asset_id,
          castPhotoId: null,
          hostedUrl,
        });
      }
    } catch (err) {
      setMirrorError(err instanceof Error ? err.message : "Failed to mirror image");
    } finally {
      setMirroring(false);
    }
  };

  return (
    <div>
      <span className="tracking-widest text-[10px] uppercase text-white/50">
        Tags
      </span>
      <div className="mt-2 flex flex-wrap gap-2">
        {displayTags.length === 0 && (
          <span className="text-xs text-white/60">No tags</span>
        )}
        {taggedPeople.length > 0
          ? taggedPeople.map((person) => (
              <span
                key={person.id ?? person.name}
                className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-xs text-white"
              >
                {person.name}
                {isEditable && (
                  <button
                    type="button"
                    onClick={() => handleRemovePerson(person)}
                    disabled={saving}
                    className="ml-1 rounded-full px-1 text-white/70 hover:text-white"
                  >
                    ×
                  </button>
                )}
              </span>
            ))
          : readonlyNames.map((name) => (
              <span
                key={name}
                className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white"
              >
                {name}
              </span>
            ))}
      </div>

      {!isEditable && hasSourceTags && (
        <p className="mt-2 text-xs text-white/60">
          Tags from source metadata are read-only here.
        </p>
      )}

      {isEditable && readonlyNames.length > 0 && taggedPeople.length === 0 && (
        <p className="mt-2 text-xs text-white/60">
          Existing tags are read-only. Re-add people to edit tags.
        </p>
      )}

      {isEditable && (
        <div className="mt-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people to tag"
            className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
            disabled={saving}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddFreeText();
              }
            }}
          />
          {searching && (
            <p className="mt-1 text-xs text-white/60">Searching...</p>
          )}
          {results.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-white/10 bg-black/60">
              {results.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => handleAddPerson(person)}
                  disabled={saving || taggedPeople.some((p) => p.id === person.id)}
                  className="flex w-full items-center justify-between px-2 py-1 text-left text-xs text-white hover:bg-white/10 disabled:opacity-50"
                >
                  <span>{person.full_name}</span>
                  {taggedPeople.some((p) => p.id === person.id) && (
                    <span className="text-white/50">Added</span>
                  )}
                </button>
              ))}
            </div>
          )}
          {results.length === 0 && query.trim().length > 0 && (
            <button
              type="button"
              onClick={handleAddFreeText}
              disabled={saving}
              className="mt-2 text-xs text-white/70 hover:text-white"
            >
              Add “{query.trim()}”
            </button>
          )}
          {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
        </div>
      )}

      <div className="mt-4">
        <span className="tracking-widest text-[10px] uppercase text-white/50">
          People Count
        </span>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min={1}
            value={peopleCountInput}
            onChange={(e) => setPeopleCountInput(e.target.value)}
            className="w-20 rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
            disabled={!isEditable || saving}
            placeholder="Auto"
          />
          {isEditable && isCountDirty && (
            <button
              type="button"
              onClick={handleSaveCount}
              disabled={saving}
              className="rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          )}
          <button
            type="button"
            onClick={handleRecount}
            disabled={!canRecount || recounting}
            className="rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20 disabled:opacity-50"
          >
            {recounting ? "Recounting..." : "Recount"}
          </button>
        </div>
        {photo.people_count_source && (
          <p className="mt-1 text-xs text-white/60">
            Count source: {photo.people_count_source}
          </p>
        )}
        {recountError && (
          <p className="mt-2 text-xs text-red-300">{recountError}</p>
        )}
        {canMirror && !photo.hosted_url && (
          <div className="mt-3">
            <button
              type="button"
              onClick={handleMirror}
              disabled={mirroring}
              className="rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20 disabled:opacity-50"
            >
              {mirroring ? "Mirroring..." : "Mirror to CDN"}
            </button>
            {mirrorError && (
              <p className="mt-2 text-xs text-red-300">{mirrorError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PersonProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const personId = params.personId as string;
  const showIdParam = searchParams.get("showId");
  const backHref = showIdParam
    ? `/admin/trr-shows/${showIdParam}?tab=cast`
    : "/admin/trr-shows";
  const backLabel = showIdParam ? "← Back to Cast" : "← Back to Shows";
  const { user, checking, hasAccess } = useAdminGuard();

  const [person, setPerson] = useState<TrrPerson | null>(null);
  const [photos, setPhotos] = useState<TrrPersonPhoto[]>([]);
  const [credits, setCredits] = useState<TrrPersonCredit[]>([]);
  const [fandomData, setFandomData] = useState<TrrCastFandom[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lightbox state - track full photo object + index for navigation
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<{
    photo: TrrPersonPhoto;
    index: number;
  } | null>(null);
  const lightboxTriggerRef = useRef<HTMLElement | null>(null);

  // Cover photo state
  const [coverPhoto, setCoverPhoto] = useState<CoverPhoto | null>(null);
  const [settingCover, setSettingCover] = useState(false);

  // Image scrape drawer state
  const [scrapeDrawerOpen, setScrapeDrawerOpen] = useState(false);

  // Refresh images state
  const [refreshingImages, setRefreshingImages] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState<{
    current: number;
    total: number;
    phase?: string;
  } | null>(null);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [photosError, setPhotosError] = useState<string | null>(null);

  // Gallery filter/sort state
  const [gallerySourceFilter, setGallerySourceFilter] = useState<string>("all");
  const [gallerySortOption, setGallerySortOption] = useState<GallerySortOption>("newest");
  const [galleryPeopleFilter, setGalleryPeopleFilter] = useState<"solo" | "all">("solo");
  const [galleryShowFilter, setGalleryShowFilter] = useState<GalleryShowFilter>(
    showIdParam ? "this-show" : "all"
  );
  const [seasonPremiereMap, setSeasonPremiereMap] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!showIdParam) {
      setGalleryShowFilter("all");
      return;
    }
    setGalleryShowFilter((prev) => (prev === "all" ? "this-show" : prev));
  }, [showIdParam]);

  const activeShow = useMemo(
    () => (showIdParam ? credits.find((credit) => credit.show_id === showIdParam) ?? null : null),
    [credits, showIdParam]
  );
  const activeShowName = activeShow?.show_name ?? null;
  const activeShowAcronym = useMemo(
    () => buildShowAcronym(activeShowName),
    [activeShowName]
  );
  const otherShowNames = useMemo(
    () =>
      credits
        .filter((credit) => credit.show_id !== showIdParam)
        .map((credit) => credit.show_name)
        .filter((name): name is string => Boolean(name)),
    [credits, showIdParam]
  );
  const otherShowAcronyms = useMemo(() => {
    const acronyms = new Set<string>();
    for (const name of otherShowNames) {
      const acronym = buildShowAcronym(name);
      if (acronym) acronyms.add(acronym.toUpperCase());
    }
    return acronyms;
  }, [otherShowNames]);

  // Compute unique sources from photos
  const uniqueSources = useMemo(() => {
    const sources = new Set(photos.map(p => p.source).filter(Boolean));
    return Array.from(sources).sort();
  }, [photos]);

  const getPhotoSortDate = useCallback(
    (photo: TrrPersonPhoto): number => {
      const metadata = mapPhotoToMetadata(photo);
      if (metadata.createdAt) return metadata.createdAt.getTime();
      if (metadata.addedAt) return metadata.addedAt.getTime();
      const seasonNumber = typeof photo.season === "number" ? photo.season : null;
      if (seasonNumber && seasonPremiereMap[seasonNumber]) {
        const date = new Date(seasonPremiereMap[seasonNumber]);
        if (!Number.isNaN(date.getTime())) return date.getTime();
      }
      return 0;
    },
    [seasonPremiereMap]
  );

  // Filter and sort photos for gallery
  const filteredPhotos = useMemo(() => {
    let result = [...photos];

    // Apply show filter (if coming from a show context)
    if (showIdParam && galleryShowFilter !== "all") {
      const showNameLower = activeShowName?.toLowerCase?.() ?? null;
      const showAcronym = activeShowAcronym?.toUpperCase?.() ?? null;
      result = result.filter((photo) => {
        const metadata = (photo.metadata ?? {}) as Record<string, unknown>;
        const text = [
          photo.caption,
          photo.context_section,
          photo.context_type,
          typeof metadata.fandom_section_label === "string"
            ? metadata.fandom_section_label
            : null,
          ...(photo.title_names ?? []),
        ]
          .filter(Boolean)
          .join(" ");
        const textLower = text.toLowerCase();
        const matchesShowName = showNameLower ? textLower.includes(showNameLower) : false;
        const acronyms = extractShowAcronyms(text);
        const matchesShowAcronym = showAcronym ? acronyms.has(showAcronym) : false;
        const metadataShowName =
          typeof metadata.show_name === "string" ? metadata.show_name.toLowerCase() : null;
        const metadataMatchesThisShow =
          Boolean(metadataShowName && showNameLower && metadataShowName.includes(showNameLower));
        const metadataMatchesOtherShow =
          Boolean(metadataShowName && showNameLower && !metadataShowName.includes(showNameLower));
        const matchesOtherShowName = otherShowNames.some((name) =>
          textLower.includes(name.toLowerCase())
        );
        const matchesOtherShowAcronym = Array.from(acronyms).some((acro) =>
          otherShowAcronyms.has(acro)
        );

        if (galleryShowFilter === "this-show") {
          return matchesShowName || matchesShowAcronym || metadataMatchesThisShow;
        }
        if (galleryShowFilter === "other-shows") {
          return (
            matchesOtherShowName ||
            matchesOtherShowAcronym ||
            metadataMatchesOtherShow
          );
        }
        return true;
      });
    }

    // Apply source filter
    if (gallerySourceFilter !== "all") {
      result = result.filter(p => p.source === gallerySourceFilter);
    }

    // Apply people filter
    if (galleryPeopleFilter === "solo") {
      result = result.filter((photo) => {
        const rawCount = photo.people_count as unknown;
        const parsedCount =
          typeof rawCount === "number"
            ? rawCount
            : typeof rawCount === "string" && rawCount.trim().length > 0
              ? Number.parseInt(rawCount, 10)
              : null;
        const inferredCount =
          parsedCount !== null && Number.isFinite(parsedCount)
            ? parsedCount
            : photo.people_names?.length ?? 0;
        return inferredCount <= 1;
      });
    }

    // Apply sort
    switch (gallerySortOption) {
      case "newest":
        result.sort((a, b) => getPhotoSortDate(b) - getPhotoSortDate(a));
        break;
      case "oldest":
        result.sort((a, b) => getPhotoSortDate(a) - getPhotoSortDate(b));
        break;
      case "season-asc":
        result.sort((a, b) => {
          const seasonA = typeof a.season === "number" ? a.season : null;
          const seasonB = typeof b.season === "number" ? b.season : null;
          if (seasonA === null && seasonB === null) {
            return getPhotoSortDate(b) - getPhotoSortDate(a);
          }
          if (seasonA === null) return 1;
          if (seasonB === null) return -1;
          if (seasonA !== seasonB) return seasonA - seasonB;
          return getPhotoSortDate(b) - getPhotoSortDate(a);
        });
        break;
      case "season-desc":
        result.sort((a, b) => {
          const seasonA = typeof a.season === "number" ? a.season : null;
          const seasonB = typeof b.season === "number" ? b.season : null;
          if (seasonA === null && seasonB === null) {
            return getPhotoSortDate(b) - getPhotoSortDate(a);
          }
          if (seasonA === null) return 1;
          if (seasonB === null) return -1;
          if (seasonA !== seasonB) return seasonB - seasonA;
          return getPhotoSortDate(b) - getPhotoSortDate(a);
        });
        break;
      case "source":
        result.sort((a, b) => (a.source || "").localeCompare(b.source || ""));
        break;
    }

    return result;
  }, [
    photos,
    galleryShowFilter,
    gallerySourceFilter,
    galleryPeopleFilter,
    gallerySortOption,
    showIdParam,
    activeShowName,
    activeShowAcronym,
    otherShowNames,
    otherShowAcronyms,
    getPhotoSortDate,
  ]);

  // Helper to get auth headers
  const getAuthHeaders = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Not authenticated");
    return { Authorization: `Bearer ${token}` };
  }, []);

  useEffect(() => {
    if (!showIdParam || !hasAccess) {
      setSeasonPremiereMap({});
      return;
    }

    let cancelled = false;

    const loadSeasonPremieres = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) {
          if (!cancelled) {
            setSeasonPremiereMap({});
          }
          return;
        }
        const response = await fetch(
          `/api/admin/trr-api/shows/${showIdParam}/seasons?limit=50`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!response.ok) throw new Error("Failed to fetch seasons");
        const data = await response.json();
        const nextMap: Record<number, string> = {};
        for (const season of (data.seasons ?? []) as Array<{
          season_number: number;
          premiere_date?: string | null;
          air_date?: string | null;
        }>) {
          const date = season.premiere_date ?? season.air_date ?? null;
          if (date && Number.isFinite(season.season_number)) {
            nextMap[season.season_number] = date;
          }
        }
        if (!cancelled) {
          setSeasonPremiereMap(nextMap);
        }
      } catch (err) {
        console.error("Failed to fetch season premiere dates:", err);
        if (!cancelled) {
          setSeasonPremiereMap({});
        }
      }
    };

    loadSeasonPremieres();
    return () => {
      cancelled = true;
    };
  }, [showIdParam, hasAccess]);

  // Refresh images for this person
  const refreshPersonImages = useCallback(
    async (options?: {
      skip_mirror?: boolean;
      limit_per_source?: number;
      force_mirror?: boolean;
    }) => {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/people/${personId}/refresh-images`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ limit_per_source: 200, force_mirror: true, ...options }),
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const normalizeValue = (value: unknown): string | null => {
          if (!value) return null;
          if (typeof value === "string") return value;
          if (value instanceof Error) return value.message;
          try {
            return JSON.stringify(value);
          } catch {
            return String(value);
          }
        };
        const errorText = normalizeValue(data.error);
        const detailText = normalizeValue(data.detail);
        const message =
          errorText && detailText
            ? `${errorText}: ${detailText}`
            : errorText || detailText || "Failed to refresh images";
        throw new Error(message);
      }
      return data;
    },
    [getAuthHeaders, personId]
  );

  // Fetch person details
  const fetchPerson = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/trr-api/people/${personId}`, { headers });
      if (!response.ok) throw new Error("Failed to fetch person");
      const data = await response.json();
      setPerson(data.person);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load person");
    }
  }, [personId, getAuthHeaders]);

  // Fetch photos
  const fetchPhotos = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/people/${personId}/photos?limit=500`,
        { headers }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          data.error && data.detail
            ? `${data.error}: ${data.detail}`
            : data.error || "Failed to fetch photos";
        throw new Error(message);
      }
      setPhotos(data.photos);
      setPhotosError(null);
    } catch (err) {
      console.error("Failed to fetch photos:", err);
      setPhotosError(err instanceof Error ? err.message : "Failed to fetch photos");
    }
  }, [personId, getAuthHeaders]);

  // Fetch credits
  const fetchCredits = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/people/${personId}/credits?limit=50`,
        { headers }
      );
      if (!response.ok) throw new Error("Failed to fetch credits");
      const data = await response.json();
      setCredits(data.credits);
    } catch (err) {
      console.error("Failed to fetch credits:", err);
    }
  }, [personId, getAuthHeaders]);

  // Fetch cover photo
  const fetchCoverPhoto = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/people/${personId}/cover-photo`,
        { headers }
      );
      if (!response.ok) return;
      const data = await response.json();
      setCoverPhoto(data.coverPhoto);
    } catch (err) {
      console.error("Failed to fetch cover photo:", err);
    }
  }, [personId, getAuthHeaders]);

  // Fetch fandom data
  const fetchFandomData = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/people/${personId}/fandom`,
        { headers }
      );
      if (!response.ok) return;
      const data = await response.json();
      setFandomData(data.fandomData ?? []);
    } catch (err) {
      console.error("Failed to fetch fandom data:", err);
    }
  }, [personId, getAuthHeaders]);

  // Set cover photo
  const handleSetCover = async (photo: TrrPersonPhoto) => {
    if (!photo.hosted_url) return;
    setSettingCover(true);
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/people/${personId}/cover-photo`,
        {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            photo_id: photo.id,
            photo_url: photo.hosted_url,
          }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        setCoverPhoto(data.coverPhoto);
      }
    } catch (err) {
      console.error("Failed to set cover photo:", err);
    } finally {
      setSettingCover(false);
    }
  };

  const handleTagsUpdated = useCallback(
    (payload: {
      mediaAssetId: string | null;
      castPhotoId: string | null;
      peopleNames: string[];
      peopleIds: string[];
      peopleCount: number | null;
      peopleCountSource: "auto" | "manual" | null;
    }) => {
      setPhotos((prev) =>
        prev.map((photo) =>
          payload.mediaAssetId && photo.media_asset_id === payload.mediaAssetId
            ? {
                ...photo,
                people_names: payload.peopleNames,
                people_ids: payload.peopleIds,
                people_count: payload.peopleCount,
                people_count_source: payload.peopleCountSource,
              }
            : payload.castPhotoId && photo.id === payload.castPhotoId
              ? {
                  ...photo,
                  people_names: payload.peopleNames,
                  people_ids: payload.peopleIds,
                  people_count: payload.peopleCount,
                  people_count_source: payload.peopleCountSource,
                }
              : photo
        )
      );
      setLightboxPhoto((prev) => {
        if (!prev) return prev;
        if (
          payload.mediaAssetId &&
          prev.photo.media_asset_id === payload.mediaAssetId
        ) {
          return {
            ...prev,
            photo: {
              ...prev.photo,
              people_names: payload.peopleNames,
              people_ids: payload.peopleIds,
              people_count: payload.peopleCount,
              people_count_source: payload.peopleCountSource,
            },
          };
        }
        if (payload.castPhotoId && prev.photo.id === payload.castPhotoId) {
          return {
            ...prev,
            photo: {
              ...prev.photo,
              people_names: payload.peopleNames,
              people_ids: payload.peopleIds,
              people_count: payload.peopleCount,
              people_count_source: payload.peopleCountSource,
            },
          };
        }
        return prev;
      });
    },
    []
  );

  const handleMirrorUpdated = useCallback(
    (payload: { mediaAssetId: string | null; castPhotoId: string | null; hostedUrl: string }) => {
      setPhotos((prev) =>
        prev.map((photo) =>
          payload.mediaAssetId && photo.media_asset_id === payload.mediaAssetId
            ? { ...photo, hosted_url: payload.hostedUrl }
            : payload.castPhotoId && photo.id === payload.castPhotoId
              ? { ...photo, hosted_url: payload.hostedUrl }
            : photo
        )
      );
      setLightboxPhoto((prev) => {
        if (!prev) return prev;
        if (payload.mediaAssetId && prev.photo.media_asset_id === payload.mediaAssetId) {
          return {
            ...prev,
            photo: { ...prev.photo, hosted_url: payload.hostedUrl },
          };
        }
        if (payload.castPhotoId && prev.photo.id === payload.castPhotoId) {
          return {
            ...prev,
            photo: { ...prev.photo, hosted_url: payload.hostedUrl },
          };
        }
        return prev;
      });
    },
    []
  );

  const handleRefreshImages = useCallback(async () => {
    if (refreshingImages) return;

    setRefreshingImages(true);
    setRefreshProgress(null);
    setRefreshNotice(null);
    setRefreshError(null);
    setPhotosError(null);

    try {
      let streamFailed = false;
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(
          `/api/admin/trr-api/people/${personId}/refresh-images/stream`,
          {
            method: "POST",
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
              skip_mirror: false,
              force_mirror: true,
              limit_per_source: 200,
            }),
          }
        );

        if (!response.ok || !response.body) {
          const data = await response.json().catch(() => ({}));
          const message =
            data.error && data.detail
              ? `${data.error}: ${data.detail}`
              : data.error || "Failed to refresh images";
          throw new Error(message);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let hadError = false;
        let sawComplete = false;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let boundaryIndex = buffer.indexOf("\n\n");
          while (boundaryIndex !== -1) {
            const rawEvent = buffer.slice(0, boundaryIndex);
            buffer = buffer.slice(boundaryIndex + 2);

            const lines = rawEvent.split("\n").filter(Boolean);
            let eventType = "message";
            const dataLines: string[] = [];
            for (const line of lines) {
              if (line.startsWith("event:")) {
                eventType = line.slice(6).trim();
              } else if (line.startsWith("data:")) {
                dataLines.push(line.slice(5).trim());
              }
            }

            const dataStr = dataLines.join("\n");
            let payload: Record<string, unknown> | string = dataStr;
            try {
              payload = JSON.parse(dataStr) as Record<string, unknown>;
            } catch {
              payload = dataStr;
            }

            if (eventType === "progress" && payload && typeof payload === "object") {
              const currentRaw = (payload as { current?: unknown }).current;
              const totalRaw = (payload as { total?: unknown }).total;
              const current =
                typeof currentRaw === "number"
                  ? currentRaw
                  : typeof currentRaw === "string"
                    ? Number.parseInt(currentRaw, 10)
                    : null;
              const total =
                typeof totalRaw === "number"
                  ? totalRaw
                  : typeof totalRaw === "string"
                    ? Number.parseInt(totalRaw, 10)
                    : null;
              if (
                typeof current === "number" &&
                Number.isFinite(current) &&
                typeof total === "number" &&
                Number.isFinite(total)
              ) {
                setRefreshProgress({
                  current,
                  total,
                  phase:
                    typeof (payload as { phase?: unknown }).phase === "string"
                      ? ((payload as { phase: string }).phase)
                      : undefined,
                });
              }
            } else if (eventType === "complete") {
              sawComplete = true;
              const summary = payload && typeof payload === "object" && "summary" in payload
                ? (payload as { summary?: unknown }).summary
                : payload;
              const summaryText = formatRefreshSummary(summary);
              setRefreshNotice(summaryText || "Images refreshed.");
            } else if (eventType === "error") {
              hadError = true;
              const message =
                payload && typeof payload === "object"
                  ? (payload as { error?: string; detail?: string })
                  : null;
              const errorText =
                message?.error && message?.detail
                  ? `${message.error}: ${message.detail}`
                  : message?.error || "Failed to refresh images";
              setRefreshError(errorText);
            }

            boundaryIndex = buffer.indexOf("\n\n");
          }
        }

        if (!sawComplete && !hadError) {
          setRefreshNotice("Images refreshed.");
        }
      } catch (streamErr) {
        streamFailed = true;
        console.warn("Refresh stream failed, falling back to non-stream.", streamErr);
      }

      if (streamFailed) {
        const result = await refreshPersonImages({ skip_mirror: false, force_mirror: true });
        const summary =
          result && typeof result === "object" && "summary" in result
            ? (result as { summary?: unknown }).summary
            : result;
        const summaryText = formatRefreshSummary(summary);
        setRefreshNotice(summaryText || "Images refreshed.");
      }

      await Promise.all([
        fetchPerson(),
        fetchCredits(),
        fetchFandomData(),
        fetchPhotos(),
        fetchCoverPhoto(),
      ]);
    } catch (err) {
      console.error("Failed to refresh images:", err);
      setRefreshError(
        err instanceof Error ? err.message : "Failed to refresh images"
      );
    } finally {
      setRefreshingImages(false);
      setRefreshProgress(null);
    }
  }, [
    refreshingImages,
    refreshPersonImages,
    fetchPerson,
    fetchCredits,
    fetchFandomData,
    fetchPhotos,
    fetchCoverPhoto,
    getAuthHeaders,
    personId,
  ]);

  // Initial load
  useEffect(() => {
    if (!hasAccess) return;

    const loadData = async () => {
      setLoading(true);
      await fetchPerson();
      await Promise.all([fetchPhotos(), fetchCredits(), fetchCoverPhoto(), fetchFandomData()]);
      setLoading(false);
    };

    loadData();
  }, [hasAccess, fetchPerson, fetchPhotos, fetchCredits, fetchCoverPhoto, fetchFandomData]);

  // Open lightbox with photo, index, and trigger element for focus restoration
  const openLightbox = (
    photo: TrrPersonPhoto,
    index: number,
    triggerElement: HTMLElement
  ) => {
    lightboxTriggerRef.current = triggerElement;
    setLightboxPhoto({ photo, index });
    setLightboxOpen(true);
  };

  // Navigate between photos in lightbox (uses filteredPhotos)
  const navigateLightbox = (direction: "prev" | "next") => {
    if (!lightboxPhoto) return;
    const newIndex =
      direction === "prev" ? lightboxPhoto.index - 1 : lightboxPhoto.index + 1;
    if (newIndex >= 0 && newIndex < filteredPhotos.length) {
      setLightboxPhoto({ photo: filteredPhotos[newIndex], index: newIndex });
    }
  };

  // Close lightbox and clean up state
  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxPhoto(null);
  };

  // Get primary photo - use cover photo if set, otherwise first hosted photo
  const primaryPhotoUrl = coverPhoto?.photo_url || photos.find(p => p.hosted_url)?.hosted_url;

  // Extract external IDs - database uses 'imdb'/'tmdb' keys, not 'imdb_id'/'tmdb_id'
  const rawExternalIds = person?.external_ids as {
    imdb?: string;
    tmdb?: number;
    tvdb?: number;
  } | undefined;
  const externalIds = rawExternalIds ? {
    imdb_id: rawExternalIds.imdb,
    tmdb_id: rawExternalIds.tmdb,
    tvdb_id: rawExternalIds.tvdb,
  } : undefined;

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Loading admin access...</p>
        </div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Loading person data...</p>
        </div>
      </div>
    );
  }

  if (error || !person) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <p className="text-lg font-semibold text-red-600">
            {error || "Person not found"}
          </p>
          <Link
            href={backHref}
            className="mt-4 inline-block text-sm text-zinc-600 hover:text-zinc-900"
          >
            {backLabel}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        {/* Header */}
        <header className="border-b border-zinc-200 bg-white px-6 py-5">
          <div className="mx-auto max-w-6xl">
            <div className="mb-4">
              <Link
                href={backHref}
                className="text-sm text-zinc-500 hover:text-zinc-900"
              >
                {backLabel}
              </Link>
            </div>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              {/* Profile Photo */}
              <ProfilePhoto url={primaryPhotoUrl} name={person.full_name} />

              {/* Person Info */}
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                  Person
                </p>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-zinc-900">
                    {person.full_name}
                  </h1>
                  {/* External links */}
                  <div className="flex items-center gap-2">
                    <TmdbLinkIcon tmdbId={externalIds?.tmdb_id} type="person" />
                    <ImdbLinkIcon imdbId={externalIds?.imdb_id} type="person" />
                  </div>
                </div>
                {person.known_for && (
                  <p className="mt-2 text-sm text-zinc-600">
                    Known for: {person.known_for}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                    {photos.length} photos
                  </span>
                  <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                    {credits.length} credits
                  </span>
                  <button
                    onClick={handleRefreshImages}
                    disabled={refreshingImages}
                    className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {refreshingImages ? "Refreshing..." : "Refresh Images"}
                  </button>
                </div>
                <div className="mt-2 space-y-2">
                  <RefreshProgressBar
                    show={refreshingImages}
                    current={refreshProgress?.current}
                    total={refreshProgress?.total}
                  />
                  {refreshError && (
                    <p className="text-xs text-red-600">{refreshError}</p>
                  )}
                  {refreshNotice && !refreshError && (
                    <p className="text-xs text-zinc-500">{refreshNotice}</p>
                  )}
                  {photosError && (
                    <p className="text-xs text-red-600">{photosError}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Tabs */}
        <div className="border-b border-zinc-200 bg-white">
          <div className="mx-auto max-w-6xl px-6">
            <nav className="flex gap-6">
              {(
                [
                  { id: "overview", label: "Overview" },
                  { id: "gallery", label: `Gallery (${photos.length})` },
                  { id: "credits", label: `Credits (${credits.length})` },
                  { id: "fandom", label: fandomData.length > 0 ? `Fandom (${fandomData.length})` : "Fandom" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`border-b-2 py-4 text-sm font-semibold transition ${
                    activeTab === tab.id
                      ? "border-zinc-900 text-zinc-900"
                      : "border-transparent text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <main className="mx-auto max-w-6xl px-6 py-8">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* External IDs */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-bold text-zinc-900">
                  External IDs
                </h3>
                <ExternalLinks
                  externalIds={person.external_ids}
                  type="person"
                  className="bg-zinc-50 rounded-lg p-4"
                />
                {Object.keys(person.external_ids || {}).length === 0 && (
                  <p className="text-sm text-zinc-500">No external IDs available.</p>
                )}
              </div>

              {/* Recent Photos Preview */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-zinc-900">Photos</h3>
                  {photos.length > 6 && (
                    <button
                      onClick={() => setActiveTab("gallery")}
                      className="text-sm font-semibold text-zinc-600 hover:text-zinc-900"
                    >
                      View all →
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {photos.slice(0, 6).map((photo, index) => (
                    <button
                      key={photo.id}
                      onClick={(e) => openLightbox(photo, index, e.currentTarget)}
                      className="relative aspect-square overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      <GalleryPhoto
                        photo={photo}
                        onClick={() => {}}
                      />
                    </button>
                  ))}
                </div>
                {photos.length === 0 && (
                  <p className="text-sm text-zinc-500">No photos available.</p>
                )}
              </div>

              {/* Credits Preview */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-zinc-900">Show Credits</h3>
                  {credits.length > 5 && (
                    <button
                      onClick={() => setActiveTab("credits")}
                      className="text-sm font-semibold text-zinc-600 hover:text-zinc-900"
                    >
                      View all →
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {credits.slice(0, 5).map((credit) => (
                    <Link
                      key={credit.id}
                      href={`/admin/trr-shows/${credit.show_id}`}
                      className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 transition hover:bg-zinc-100"
                    >
                      <div>
                        <p className="font-semibold text-zinc-900">
                          {credit.show_name || "Unknown Show"}
                        </p>
                        {credit.role && (
                          <p className="text-sm text-zinc-600">{credit.role}</p>
                        )}
                      </div>
                      <span className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-xs text-zinc-600">
                        {credit.credit_category}
                      </span>
                    </Link>
                  ))}
                </div>
                {credits.length === 0 && (
                  <p className="text-sm text-zinc-500">No credits available.</p>
                )}
              </div>

              {/* Fandom Preview */}
              {fandomData.length > 0 && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-2">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-zinc-900">Fandom Info</h3>
                    <button
                      onClick={() => setActiveTab("fandom")}
                      className="text-sm font-semibold text-zinc-600 hover:text-zinc-900"
                    >
                      View all →
                    </button>
                  </div>
                  {fandomData[0]?.summary && (
                    <p className="text-sm text-zinc-600 mb-4 line-clamp-3">
                      {fandomData[0].summary}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {fandomData[0]?.resides_in && (
                      <div>
                        <span className="text-zinc-500">Lives in:</span>{" "}
                        <span className="text-zinc-900">{fandomData[0].resides_in}</span>
                      </div>
                    )}
                    {fandomData[0]?.birthdate_display && (
                      <div>
                        <span className="text-zinc-500">Birthday:</span>{" "}
                        <span className="text-zinc-900">{fandomData[0].birthdate_display}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Gallery Tab */}
          {activeTab === "gallery" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Photo Gallery
                  </p>
                  <h3 className="text-xl font-bold text-zinc-900">
                    {person.full_name}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleRefreshImages}
                    disabled={refreshingImages}
                    className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M20 8a8 8 0 00-14-4M4 16a8 8 0 0014 4" />
                    </svg>
                    {refreshingImages ? "Refreshing..." : "Refresh Images"}
                  </button>
                  <button
                    onClick={() => setScrapeDrawerOpen(true)}
                    className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Import Images
                  </button>
                </div>
              </div>
              <div className="mb-4 space-y-2">
                <RefreshProgressBar
                  show={refreshingImages}
                  current={refreshProgress?.current}
                  total={refreshProgress?.total}
                />
                {refreshError && (
                  <p className="text-xs text-red-600">{refreshError}</p>
                )}
                {refreshNotice && !refreshError && (
                  <p className="text-xs text-zinc-500">{refreshNotice}</p>
                )}
              </div>

              {showIdParam && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                    Media View
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setGalleryShowFilter("this-show")}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        galleryShowFilter === "this-show"
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      {activeShowName ? `This Show (${activeShowName})` : "This Show"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setGalleryShowFilter("all")}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        galleryShowFilter === "all"
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                      }`}
                    >
                      All Media
                    </button>
                  </div>
                </div>
              )}

              {/* Filter and Sort Controls */}
              <div className="mb-6 flex flex-wrap items-center gap-4">
                {/* Source Filter */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-zinc-700">Source:</label>
                  <select
                    value={gallerySourceFilter}
                    onChange={(e) => setGallerySourceFilter(e.target.value)}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                  >
                    <option value="all">All Sources ({photos.length})</option>
                    {uniqueSources.map((source) => {
                      const count = photos.filter(p => p.source === source).length;
                      return (
                        <option key={source} value={source}>
                          {source} ({count})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* People Filter */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-zinc-700">People:</label>
                  <select
                    value={galleryPeopleFilter}
                    onChange={(e) => setGalleryPeopleFilter(e.target.value as "solo" | "all")}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                  >
                    <option value="solo">Solo Only</option>
                    <option value="all">All Photos</option>
                  </select>
                </div>

                {/* Sort */}
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-zinc-700">Sort:</label>
                  <select
                    value={gallerySortOption}
                    onChange={(e) => setGallerySortOption(e.target.value as GallerySortOption)}
                    className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="season-desc">Season (Newest)</option>
                    <option value="season-asc">Season (Oldest)</option>
                    <option value="source">By Source</option>
                  </select>
                </div>

                {/* Count indicator */}
                {(gallerySourceFilter !== "all" ||
                  galleryPeopleFilter !== "all" ||
                  galleryShowFilter !== "all") && (
                  <span className="text-sm text-zinc-500">
                    Showing {filteredPhotos.length} of {photos.length} photos
                  </span>
                )}
              </div>

              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {filteredPhotos.map((photo, index) => (
                  <div
                    key={photo.id}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => openLightbox(photo, index, e.currentTarget as HTMLElement)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        openLightbox(photo, index, e.currentTarget as HTMLElement);
                      }
                    }}
                    className="group relative aspect-square overflow-hidden rounded-lg bg-zinc-200 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <GalleryPhoto
                      photo={photo}
                      onClick={() => {}}
                      isCover={coverPhoto?.photo_id === photo.id}
                      onSetCover={photo.hosted_url ? () => handleSetCover(photo) : undefined}
                      settingCover={settingCover}
                    />
                    {/* Overlay with source info */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                      <p className="text-xs text-white truncate">
                        {photo.source}
                        {photo.season && ` • S${photo.season}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {filteredPhotos.length === 0 && photos.length > 0 && (
                <p className="text-sm text-zinc-500">
                  No photos match the current filter.
                </p>
              )}
              {photos.length === 0 && (
                <p className="text-sm text-zinc-500">
                  No photos available for this person.
                </p>
              )}
            </div>
          )}

          {/* Credits Tab */}
          {activeTab === "credits" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                  Show Credits
                </p>
                <h3 className="text-xl font-bold text-zinc-900">
                  {person.full_name}
                </h3>
              </div>
              <div className="space-y-3">
                {credits.map((credit) => (
                  <Link
                    key={credit.id}
                    href={`/admin/trr-shows/${credit.show_id}`}
                    className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 p-4 transition hover:bg-zinc-100"
                  >
                    <div>
                      <p className="font-semibold text-zinc-900">
                        {credit.show_name || "Unknown Show"}
                      </p>
                      {credit.role && (
                        <p className="text-sm text-zinc-600">{credit.role}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600">
                        {credit.credit_category}
                      </span>
                      {credit.billing_order && (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                          #{credit.billing_order}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
              {credits.length === 0 && (
                <p className="text-sm text-zinc-500">
                  No credits available for this person.
                </p>
              )}
            </div>
          )}

          {/* Fandom Tab */}
          {activeTab === "fandom" && (
            <div className="space-y-6">
              {fandomData.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                  <p className="text-sm text-zinc-500">
                    No Fandom/Wikia data available for this person.
                  </p>
                </div>
              ) : (
                fandomData.map((fandom) => (
                  <div key={fandom.id} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                    {/* Source header with link */}
                    <div className="mb-6 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                          {fandom.source}
                        </p>
                        <h3 className="text-xl font-bold text-zinc-900">
                          {fandom.page_title || fandom.full_name || "Fandom Profile"}
                        </h3>
                      </div>
                      {fandom.source_url && (
                        <a
                          href={fandom.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
                        >
                          View on Fandom →
                        </a>
                      )}
                    </div>

                    {/* Summary */}
                    {fandom.summary && (
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-zinc-700 mb-2">Summary</h4>
                        <p className="text-sm text-zinc-600 leading-relaxed">{fandom.summary}</p>
                      </div>
                    )}

                    {/* Biographical Info Grid */}
                    <div className="grid gap-6 lg:grid-cols-2">
                      {/* Personal Details */}
                      <FandomSection title="Personal Details">
                        <FandomField label="Full Name" value={fandom.full_name} />
                        <FandomField label="Birthday" value={fandom.birthdate_display} />
                        <FandomField label="Gender" value={fandom.gender} />
                        <FandomField label="Resides In" value={fandom.resides_in} />
                        <FandomField label="Hair Color" value={fandom.hair_color} />
                        <FandomField label="Eye Color" value={fandom.eye_color} />
                        <FandomField label="Height" value={fandom.height_display} />
                        <FandomField label="Weight" value={fandom.weight_display} />
                      </FandomSection>

                      {/* Show Info */}
                      <FandomSection title="Show Information">
                        <FandomField label="Installment" value={fandom.installment} />
                        <FandomField label="Seasons" value={fandom.main_seasons_display} />
                      </FandomSection>
                    </div>

                    {/* Relationships */}
                    {(fandom.romances?.length || fandom.family || fandom.friends || fandom.enemies) && (
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold text-zinc-700 mb-3">Relationships</h4>
                        <div className="grid gap-4 lg:grid-cols-2">
                          {fandom.romances && fandom.romances.length > 0 && (
                            <FandomList title="Romances" items={fandom.romances} />
                          )}
                          {fandom.family && Object.keys(fandom.family).length > 0 && (
                            <FandomJsonList title="Family" data={fandom.family} />
                          )}
                          {fandom.friends && Object.keys(fandom.friends).length > 0 && (
                            <FandomJsonList title="Friends" data={fandom.friends} />
                          )}
                          {fandom.enemies && Object.keys(fandom.enemies).length > 0 && (
                            <FandomJsonList title="Enemies" data={fandom.enemies} />
                          )}
                        </div>
                      </div>
                    )}

                    {/* Taglines */}
                    {fandom.taglines && Object.keys(fandom.taglines).length > 0 && (
                      <FandomTaglines taglines={fandom.taglines} />
                    )}

                    {/* Trivia */}
                    {fandom.trivia && (Array.isArray(fandom.trivia) ? fandom.trivia.length > 0 : Object.keys(fandom.trivia).length > 0) && (
                      <FandomTrivia trivia={fandom.trivia} />
                    )}

                    {/* Reunion Seating */}
                    {fandom.reunion_seating && Object.keys(fandom.reunion_seating).length > 0 && (
                      <FandomReunionSeating seating={fandom.reunion_seating} />
                    )}

                    {/* Scraped timestamp */}
                    <div className="mt-6 pt-4 border-t border-zinc-100">
                      <p className="text-xs text-zinc-400">
                        Last updated: {new Date(fandom.scraped_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </main>

        {/* Lightbox with metadata and navigation */}
        {lightboxPhoto && (
          <ImageLightbox
            src={lightboxPhoto.photo.hosted_url || lightboxPhoto.photo.url || ""}
            fallbackSrc={
              lightboxPhoto.photo.hosted_url ? lightboxPhoto.photo.url : null
            }
            alt={lightboxPhoto.photo.caption || person.full_name}
            isOpen={lightboxOpen}
            onClose={closeLightbox}
            metadata={mapPhotoToMetadata(lightboxPhoto.photo)}
            metadataExtras={
              <TagPeoplePanel
                photo={lightboxPhoto.photo}
                getAuthHeaders={getAuthHeaders}
                onTagsUpdated={handleTagsUpdated}
                onMirrorUpdated={handleMirrorUpdated}
              />
            }
            position={{ current: lightboxPhoto.index + 1, total: filteredPhotos.length }}
            onPrevious={() => navigateLightbox("prev")}
            onNext={() => navigateLightbox("next")}
            hasPrevious={lightboxPhoto.index > 0}
            hasNext={lightboxPhoto.index < filteredPhotos.length - 1}
            triggerRef={lightboxTriggerRef as React.RefObject<HTMLElement | null>}
          />
        )}

        {/* Image scrape drawer */}
        <ImageScrapeDrawer
          isOpen={scrapeDrawerOpen}
          onClose={() => setScrapeDrawerOpen(false)}
          entityContext={{
            type: "person",
            personId: personId,
            personName: person.full_name,
          } as PersonContext}
          onImportComplete={() => {
            // Refresh photos after import
            fetchPhotos();
          }}
        />
      </div>
    </ClientOnly>
  );
}

// Fandom Helper Components
function FandomSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-4">
      <h4 className="text-sm font-semibold text-zinc-700 mb-3">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function FandomField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="text-zinc-500 w-28 flex-shrink-0">{label}:</span>
      <span className="text-zinc-900">{value}</span>
    </div>
  );
}

function FandomList({ title, items }: { title: string; items: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-3">
      <p className="text-xs font-semibold text-zinc-500 mb-2">{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-zinc-700">• {item}</li>
        ))}
      </ul>
    </div>
  );
}

function FandomJsonList({ title, data }: { title: string; data: Record<string, unknown> | unknown[] }) {
  // Handle both array and object formats
  const items: string[] = [];

  if (Array.isArray(data)) {
    // Array of objects like [{name: "Person", relation: "Friend"}] or just strings
    for (const item of data) {
      if (typeof item === 'string') {
        items.push(item);
      } else if (item && typeof item === 'object') {
        // Try to extract meaningful display text from the object
        const obj = item as Record<string, unknown>;
        if (obj.name) {
          const relation = obj.relation ? ` (${obj.relation})` : '';
          items.push(`${obj.name}${relation}`);
        } else {
          // Fall back to showing the first string value found
          const firstVal = Object.values(obj).find(v => typeof v === 'string');
          if (firstVal) items.push(firstVal as string);
        }
      }
    }
  } else {
    // Object format like {key: value}
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        items.push(`${key}: ${value}`);
      } else if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        if (obj.name) {
          items.push(`${key}: ${obj.name}`);
        }
      }
    }
  }

  if (items.length === 0) return null;
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50/50 p-3">
      <p className="text-xs font-semibold text-zinc-500 mb-2">{title}</p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-zinc-700">• {item}</li>
        ))}
      </ul>
    </div>
  );
}

function FandomTaglines({ taglines }: { taglines: Record<string, unknown> | unknown[] }) {
  // Handle both array and object formats
  const items: { season: string; tagline: string }[] = [];

  if (Array.isArray(taglines)) {
    // Array format like [{season: "1", tagline: "Quote"}]
    for (const item of taglines) {
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        const season = obj.season ? String(obj.season) : obj.year ? String(obj.year) : `#${items.length + 1}`;
        const rawTagline = obj.tagline || obj.quote || obj.text;
        if (rawTagline) {
          // Strip outer quotes if present (data often has embedded quotes)
          let tagline = String(rawTagline);
          if (tagline.startsWith('"') && tagline.endsWith('"')) {
            tagline = tagline.slice(1, -1);
          }
          items.push({ season, tagline });
        }
      } else if (typeof item === 'string') {
        items.push({ season: `#${items.length + 1}`, tagline: item });
      }
    }
  } else {
    // Object format like {"Season 1": "Quote"}
    for (const [season, tagline] of Object.entries(taglines)) {
      if (typeof tagline === 'string') {
        items.push({ season, tagline });
      } else if (tagline && typeof tagline === 'object') {
        const obj = tagline as Record<string, unknown>;
        const text = obj.tagline || obj.quote || obj.text;
        if (text) items.push({ season, tagline: String(text) });
      }
    }
  }

  if (items.length === 0) return null;
  return (
    <div className="mt-6">
      <h4 className="text-sm font-semibold text-zinc-700 mb-3">Taglines</h4>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
            <span className="text-xs font-semibold text-amber-700 bg-amber-200 px-2 py-0.5 rounded h-fit">
              {item.season}
            </span>
            <p className="text-sm text-amber-900 italic">&ldquo;{item.tagline}&rdquo;</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FandomTrivia({ trivia }: { trivia: Record<string, unknown> | unknown[] }) {
  // Handle both array and object formats
  const items: string[] = [];

  if (Array.isArray(trivia)) {
    for (const item of trivia) {
      if (typeof item === 'string') {
        items.push(item);
      } else if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        const text = obj.text || obj.fact || obj.trivia || obj.content;
        if (text) items.push(String(text));
      }
    }
  } else {
    for (const value of Object.values(trivia)) {
      if (typeof value === 'string') {
        items.push(value);
      } else if (value && typeof value === 'object') {
        const obj = value as Record<string, unknown>;
        const text = obj.text || obj.fact || obj.trivia || obj.content;
        if (text) items.push(String(text));
      }
    }
  }

  if (items.length === 0) return null;
  return (
    <div className="mt-6">
      <h4 className="text-sm font-semibold text-zinc-700 mb-3">Trivia</h4>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-zinc-600 pl-4 border-l-2 border-zinc-200">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FandomReunionSeating({ seating }: { seating: Record<string, unknown> | unknown[] }) {
  // Handle both array and object formats
  const items: { reunion: string; position: string }[] = [];

  if (Array.isArray(seating)) {
    // Array format like [{reunion: "Season 1 Reunion", position: "3"}]
    for (const item of seating) {
      if (item && typeof item === 'object') {
        const obj = item as Record<string, unknown>;
        const season = obj.season;
        const seatOrder = obj.seat_order ?? obj.position ?? obj.seat;
        if (season !== undefined && seatOrder) {
          items.push({ reunion: `Season ${season} Reunion`, position: String(seatOrder) });
        }
      }
    }
  } else {
    // Object format like {"Season 1 Reunion": "3"}
    for (const [reunion, position] of Object.entries(seating)) {
      if (typeof position === 'string' || typeof position === 'number') {
        items.push({ reunion, position: String(position) });
      } else if (position && typeof position === 'object') {
        const obj = position as Record<string, unknown>;
        const pos = obj.position || obj.seat || obj.order;
        if (pos !== undefined) items.push({ reunion, position: String(pos) });
      }
    }
  }

  if (items.length === 0) return null;
  return (
    <div className="mt-6">
      <h4 className="text-sm font-semibold text-zinc-700 mb-3">Reunion Seating</h4>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between p-2 rounded bg-zinc-50 text-sm">
            <span className="text-zinc-600">{item.reunion}</span>
            <span className="font-medium text-zinc-900">{item.position}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
