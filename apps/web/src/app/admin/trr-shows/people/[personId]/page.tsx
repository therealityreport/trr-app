"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ClientOnly from "@/components/ClientOnly";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { auth } from "@/lib/firebase";
import { ExternalLinks, TmdbLinkIcon, ImdbLinkIcon } from "@/components/admin/ExternalLinks";
import { ImageLightbox } from "@/components/admin/ImageLightbox";

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
}

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

type TabId = "overview" | "gallery" | "credits";

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
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);

  // Cover photo state
  const [coverPhoto, setCoverPhoto] = useState<CoverPhoto | null>(null);
  const [settingCover, setSettingCover] = useState(false);

  // Helper to get auth headers
  const getAuthHeaders = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error("Not authenticated");
    return { Authorization: `Bearer ${token}` };
  }, []);

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
        `/api/admin/trr-api/people/${personId}/photos?limit=100`,
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

  // Initial load
  useEffect(() => {
    if (!hasAccess) return;

    const loadData = async () => {
      setLoading(true);
      await fetchPerson();
      await Promise.all([fetchPhotos(), fetchCredits(), fetchCoverPhoto()]);
      setLoading(false);
    };

    loadData();
  }, [hasAccess, fetchPerson, fetchPhotos, fetchCredits, fetchCoverPhoto]);

  // Open lightbox
  const openLightbox = (src: string, alt: string) => {
    setLightboxImage({ src, alt });
    setLightboxOpen(true);
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
              <div className="relative h-32 w-32 flex-shrink-0 overflow-hidden rounded-xl bg-zinc-200">
                {primaryPhotoUrl ? (
                  <Image
                    src={primaryPhotoUrl}
                    alt={person.full_name}
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-zinc-400">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
                      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </div>
                )}
              </div>

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
                  {photos.slice(0, 6).map((photo) => (
                    <div
                      key={photo.id}
                      className="relative aspect-square overflow-hidden rounded-lg bg-zinc-200"
                    >
                      <GalleryPhoto
                        photo={photo}
                        onClick={() => openLightbox(
                          photo.hosted_url || photo.url || "",
                          photo.caption || person.full_name
                        )}
                      />
                    </div>
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
            </div>
          )}

          {/* Gallery Tab */}
          {activeTab === "gallery" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                  Photo Gallery
                </p>
                <h3 className="text-xl font-bold text-zinc-900">
                  {person.full_name}
                </h3>
              </div>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="group relative aspect-square overflow-hidden rounded-lg bg-zinc-200"
                  >
                    <GalleryPhoto
                      photo={photo}
                      onClick={() => openLightbox(
                        photo.hosted_url || photo.url || "",
                        photo.caption || person.full_name
                      )}
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
        </main>

        {/* Lightbox */}
        {lightboxImage && (
          <ImageLightbox
            src={lightboxImage.src}
            alt={lightboxImage.alt}
            isOpen={lightboxOpen}
            onClose={() => {
              setLightboxOpen(false);
              setLightboxImage(null);
            }}
          />
        )}
      </div>
    </ClientOnly>
  );
}
