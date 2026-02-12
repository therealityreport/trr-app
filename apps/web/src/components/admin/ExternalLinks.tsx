"use client";

import { tmdbLinks, imdbLinks, tvdbLinks } from "@/lib/tmdb/links";

interface ExternalIds {
  // Support both _id suffix (API format) and no suffix (database format)
  imdb_id?: string | null;
  imdb?: string | null;
  tmdb_id?: number | null;
  tmdb?: number | null;
  tvdb_id?: number | null;
  tvdb?: number | null;
  freebase_mid?: string | null;
  freebase_id?: string | null;
  tvrage_id?: number | null;
  wikidata_id?: string | null;
  facebook_id?: string | null;
  facebook?: string | null;
  facebook_url?: string | null;
  instagram_id?: string | null;
  instagram?: string | null;
  instagram_url?: string | null;
  twitter_id?: string | null;
  twitter?: string | null;
  twitter_url?: string | null;
  tiktok_id?: string | null;
  tiktok?: string | null;
  tiktok_url?: string | null;
  youtube_id?: string | null;
  youtube?: string | null;
  youtube_url?: string | null;
  [key: string]: unknown;
}

interface ExternalLinksProps {
  externalIds: ExternalIds | null | undefined;
  tmdbId?: number | null;
  imdbId?: string | null;
  type?: "show" | "person";
  className?: string;
}

/**
 * Component that displays external IDs with clickable links to external sites.
 */
export function ExternalLinks({
  externalIds,
  tmdbId,
  imdbId,
  type = "show",
  className = "",
}: ExternalLinksProps) {
  // Combine explicit props with externalIds object
  // Normalize keys - database uses 'imdb'/'tmdb', API uses 'imdb_id'/'tmdb_id'
  const rawIds: ExternalIds = {
    ...externalIds,
    ...(tmdbId !== undefined && { tmdb_id: tmdbId }),
    ...(imdbId !== undefined && { imdb_id: imdbId }),
  };

  // Normalize to _id suffix format
  const ids: ExternalIds = {
    ...rawIds,
    imdb_id: rawIds.imdb_id ?? rawIds.imdb,
    tmdb_id: rawIds.tmdb_id ?? rawIds.tmdb,
    tvdb_id: rawIds.tvdb_id ?? rawIds.tvdb,
    facebook_id: rawIds.facebook_id ?? rawIds.facebook,
    instagram_id: rawIds.instagram_id ?? rawIds.instagram,
    twitter_id: rawIds.twitter_id ?? rawIds.twitter,
    tiktok_id: rawIds.tiktok_id ?? rawIds.tiktok,
    youtube_id: rawIds.youtube_id ?? rawIds.youtube,
  };

  // Check if we have any IDs to display
  const hasIds = Object.values(ids).some((value) => {
    if (value === null || value === undefined || value === "") return false;
    return true;
  });

  if (!hasIds) {
    return null;
  }

  const linkEntries: Array<{ label: string; url: string | null; value: string }> = [];

  // TMDb
  if (ids.tmdb_id) {
    const url =
      type === "person"
        ? tmdbLinks.person(ids.tmdb_id)
        : tmdbLinks.show(ids.tmdb_id);
    linkEntries.push({ label: "TMDb", url, value: String(ids.tmdb_id) });
  }

  // IMDb
  if (ids.imdb_id) {
    const url =
      type === "person"
        ? imdbLinks.person(ids.imdb_id)
        : imdbLinks.title(ids.imdb_id);
    linkEntries.push({ label: "IMDb", url, value: ids.imdb_id });
  }

  // TVDb
  if (ids.tvdb_id) {
    const url =
      type === "person"
        ? tvdbLinks.person(ids.tvdb_id)
        : tvdbLinks.series(ids.tvdb_id);
    linkEntries.push({ label: "TVDb", url, value: String(ids.tvdb_id) });
  }

  // Wikidata
  if (ids.wikidata_id) {
    linkEntries.push({
      label: "Wikidata",
      url: `https://www.wikidata.org/wiki/${ids.wikidata_id}`,
      value: ids.wikidata_id,
    });
  }

  // Freebase MID (no active site, just display)
  if (ids.freebase_mid) {
    linkEntries.push({
      label: "Freebase MID",
      url: null,
      value: ids.freebase_mid,
    });
  }

  // Freebase ID
  if (ids.freebase_id) {
    linkEntries.push({
      label: "Freebase ID",
      url: null,
      value: ids.freebase_id,
    });
  }

  // TV Rage (defunct, just display)
  if (ids.tvrage_id) {
    linkEntries.push({
      label: "TV Rage",
      url: null,
      value: String(ids.tvrage_id),
    });
  }

  // Social media
  if (ids.facebook_id) {
    const handle = ids.facebook_id.replace(/^@+/, "");
    linkEntries.push({
      label: "Facebook",
      url:
        typeof ids.facebook_url === "string" && ids.facebook_url.trim()
          ? ids.facebook_url.trim()
          : `https://www.facebook.com/${handle}`,
      value: handle,
    });
  }

  if (ids.instagram_id) {
    const handle = ids.instagram_id.replace(/^@+/, "");
    linkEntries.push({
      label: "Instagram",
      url:
        typeof ids.instagram_url === "string" && ids.instagram_url.trim()
          ? ids.instagram_url.trim()
          : `https://www.instagram.com/${handle}`,
      value: handle,
    });
  }

  if (ids.twitter_id) {
    const handle = ids.twitter_id.replace(/^@+/, "");
    linkEntries.push({
      label: "Twitter/X",
      url:
        typeof ids.twitter_url === "string" && ids.twitter_url.trim()
          ? ids.twitter_url.trim()
          : `https://x.com/${handle}`,
      value: handle,
    });
  }

  if (ids.tiktok_id) {
    const handle = ids.tiktok_id.replace(/^@+/, "");
    linkEntries.push({
      label: "TikTok",
      url:
        typeof ids.tiktok_url === "string" && ids.tiktok_url.trim()
          ? ids.tiktok_url.trim()
          : `https://www.tiktok.com/@${handle}`,
      value: handle,
    });
  }

  if (ids.youtube_id) {
    const handle = ids.youtube_id.trim();
    const defaultUrl = handle.startsWith("@")
      ? `https://www.youtube.com/${handle}`
      : handle.toUpperCase().startsWith("UC")
      ? `https://www.youtube.com/channel/${handle}`
      : `https://www.youtube.com/@${handle.replace(/^@+/, "")}`;
    linkEntries.push({
      label: "YouTube",
      url:
        typeof ids.youtube_url === "string" && ids.youtube_url.trim()
          ? ids.youtube_url.trim()
          : defaultUrl,
      value: handle,
    });
  }

  if (linkEntries.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {linkEntries.map((entry) => (
        <div key={entry.label} className="flex items-center gap-2 text-sm">
          <span className="text-zinc-500 w-24 flex-shrink-0">{entry.label}:</span>
          {entry.url ? (
            <a
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
            >
              {entry.value}
              <ExternalLinkIcon className="h-3 w-3" />
            </a>
          ) : (
            <span className="text-zinc-700">{entry.value}</span>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Small external link icon for inline use.
 */
function ExternalLinkIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 3H3v10h10V9" />
      <path d="M10 3h3v3" />
      <path d="M6.5 9.5L13 3" />
    </svg>
  );
}

/**
 * Inline TMDb link icon button.
 */
export function TmdbLinkIcon({
  tmdbId,
  type = "show",
  seasonNumber,
  episodeNumber,
  showTmdbId,
  className = "",
}: {
  tmdbId?: number | null;
  type?: "show" | "season" | "episode" | "person";
  seasonNumber?: number;
  episodeNumber?: number;
  showTmdbId?: number;
  className?: string;
}) {
  if (!tmdbId && !showTmdbId) return null;

  let url: string;
  if (type === "person" && tmdbId) {
    url = tmdbLinks.person(tmdbId);
  } else if (type === "episode" && showTmdbId && seasonNumber !== undefined && episodeNumber !== undefined) {
    url = tmdbLinks.episode(showTmdbId, seasonNumber, episodeNumber);
  } else if (type === "season" && showTmdbId && seasonNumber !== undefined) {
    url = tmdbLinks.season(showTmdbId, seasonNumber);
  } else if (tmdbId) {
    url = tmdbLinks.show(tmdbId);
  } else {
    return null;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title="View on TMDb"
      className={`inline-flex items-center justify-center text-zinc-400 hover:text-blue-600 transition-colors ${className}`}
    >
      <TmdbIcon className="h-4 w-4" />
    </a>
  );
}

/**
 * TMDb logo icon.
 */
function TmdbIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15H9V7h2v10zm4 0h-2V7h2v10z" />
    </svg>
  );
}

/**
 * IMDb link icon button.
 */
export function ImdbLinkIcon({
  imdbId,
  type = "title",
  className = "",
}: {
  imdbId?: string | null;
  type?: "title" | "person";
  className?: string;
}) {
  if (!imdbId) return null;

  const url = type === "person" ? imdbLinks.person(imdbId) : imdbLinks.title(imdbId);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title="View on IMDb"
      className={`inline-flex items-center justify-center text-zinc-400 hover:text-yellow-600 transition-colors ${className}`}
    >
      <ImdbIcon className="h-4 w-4" />
    </a>
  );
}

/**
 * IMDb logo icon (simplified).
 */
function ImdbIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <text x="12" y="15" fontSize="7" fontWeight="bold" textAnchor="middle" fill="white">
        IMDb
      </text>
    </svg>
  );
}
