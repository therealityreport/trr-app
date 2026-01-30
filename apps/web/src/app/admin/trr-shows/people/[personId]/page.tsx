"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams } from "next/navigation";
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
  caption: string | null;
  width: number | null;
  height: number | null;
  context_type: string | null;
  season: number | null;
  // Metadata fields for lightbox display
  people_names: string[] | null;
  title_names: string[] | null;
  metadata: Record<string, unknown> | null;
  fetched_at: string | null;
  created_at: string | null;
}

type GallerySortOption = "newest" | "oldest" | "source";

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

// Profile photo with error handling
function ProfilePhoto({ url, name }: { url: string | null | undefined; name: string }) {
  const [hasError, setHasError] = useState(false);

  if (!url || hasError) {
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
        src={url}
        alt={name}
        fill
        className="object-cover"
        sizes="128px"
        onError={() => setHasError(true)}
      />
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
  const src = photo.hosted_url || photo.url;

  if (hasError || !src) {
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
        src={src}
        alt={photo.caption || "Photo"}
        fill
        className="object-cover cursor-zoom-in transition hover:scale-105"
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
        onClick={onClick}
        onError={() => setHasError(true)}
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

export default function PersonProfilePage() {
  const params = useParams();
  const personId = params.personId as string;
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
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  // Gallery filter/sort state
  const [gallerySourceFilter, setGallerySourceFilter] = useState<string>("all");
  const [gallerySortOption, setGallerySortOption] = useState<GallerySortOption>("newest");

  // Compute unique sources from photos
  const uniqueSources = useMemo(() => {
    const sources = new Set(photos.map(p => p.source).filter(Boolean));
    return Array.from(sources).sort();
  }, [photos]);

  // Filter and sort photos for gallery
  const filteredPhotos = useMemo(() => {
    let result = [...photos];

    // Apply source filter
    if (gallerySourceFilter !== "all") {
      result = result.filter(p => p.source === gallerySourceFilter);
    }

    // Apply sort
    switch (gallerySortOption) {
      case "newest":
        result.sort((a, b) => {
          const dateA = a.created_at || a.fetched_at || "";
          const dateB = b.created_at || b.fetched_at || "";
          return dateB.localeCompare(dateA);
        });
        break;
      case "oldest":
        result.sort((a, b) => {
          const dateA = a.created_at || a.fetched_at || "";
          const dateB = b.created_at || b.fetched_at || "";
          return dateA.localeCompare(dateB);
        });
        break;
      case "source":
        result.sort((a, b) => (a.source || "").localeCompare(b.source || ""));
        break;
    }

    return result;
  }, [photos, gallerySourceFilter, gallerySortOption]);

  // Helper to get auth headers
  const getAuthHeaders = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Not authenticated");
    return { Authorization: `Bearer ${token}` };
  }, []);

  // Refresh images for this person
  const refreshPersonImages = useCallback(
    async (options?: { skip_mirror?: boolean }) => {
      const headers = await getAuthHeaders();
      const response = await fetch(
        `/api/admin/trr-api/people/${personId}/refresh-images`,
        {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify(options ?? {}),
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = data.error || data.detail || "Failed to refresh images";
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
      if (!response.ok) throw new Error("Failed to fetch photos");
      const data = await response.json();
      setPhotos(data.photos);
    } catch (err) {
      console.error("Failed to fetch photos:", err);
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

  const handleRefreshImages = useCallback(async () => {
    if (refreshingImages) return;

    setRefreshingImages(true);
    setRefreshNotice(null);
    setRefreshError(null);

    try {
      const result = await refreshPersonImages({ skip_mirror: false });
      await Promise.all([fetchPhotos(), fetchCoverPhoto()]);

      let summaryText: string | null = null;
      if (result && typeof result === "object" && "summary" in result) {
        const summary = (result as { summary?: unknown }).summary;
        if (typeof summary === "string") {
          summaryText = summary;
        } else if (summary && typeof summary === "object") {
          const parts = Object.entries(summary as Record<string, unknown>)
            .filter(([, value]) => typeof value === "number")
            .map(([key, value]) => `${key.replace(/_/g, " ")}: ${value}`);
          summaryText = parts.length > 0 ? parts.join(", ") : null;
        }
      }

      setRefreshNotice(summaryText || "Images refreshed.");
    } catch (err) {
      console.error("Failed to refresh images:", err);
      setRefreshError(
        err instanceof Error ? err.message : "Failed to refresh images"
      );
    } finally {
      setRefreshingImages(false);
    }
  }, [refreshingImages, refreshPersonImages, fetchPhotos, fetchCoverPhoto]);

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
            href="/admin/trr-shows"
            className="mt-4 inline-block text-sm text-zinc-600 hover:text-zinc-900"
          >
            ← Back to Shows
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
                href="/admin/trr-shows"
                className="text-sm text-zinc-500 hover:text-zinc-900"
              >
                ← Back to Shows
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
                {(refreshNotice || refreshError) && (
                  <p className={`mt-2 text-xs ${refreshError ? "text-red-600" : "text-zinc-500"}`}>
                    {refreshError || refreshNotice}
                  </p>
                )}
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
                    <option value="source">By Source</option>
                  </select>
                </div>

                {/* Count indicator */}
                {gallerySourceFilter !== "all" && (
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
            alt={lightboxPhoto.photo.caption || person.full_name}
            isOpen={lightboxOpen}
            onClose={closeLightbox}
            metadata={mapPhotoToMetadata(lightboxPhoto.photo)}
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
