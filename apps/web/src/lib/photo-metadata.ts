import type { TrrPersonPhoto } from "@/lib/server/trr-api/trr-shows-repository";

export interface PhotoMetadata {
  source: string;
  sourceBadgeColor: string;
  caption: string | null;
  dimensions: { width: number; height: number } | null;
  season: number | null;
  contextType: string | null;
  people: string[];
  titles: string[];
  fetchedAt: Date | null;
}

const SOURCE_COLORS: Record<string, string> = {
  imdb: "#f5c518",
  tmdb: "#01d277",
};

export function mapPhotoToMetadata(photo: TrrPersonPhoto): PhotoMetadata {
  return {
    source: photo.source,
    sourceBadgeColor: SOURCE_COLORS[photo.source.toLowerCase()] ?? "#6b7280",
    caption: photo.caption,
    dimensions:
      photo.width && photo.height
        ? { width: photo.width, height: photo.height }
        : null,
    season: photo.season,
    contextType: photo.context_type,
    people: [...new Set(photo.people_names ?? [])],
    titles: [...new Set(photo.title_names ?? [])],
    fetchedAt: photo.fetched_at ? new Date(photo.fetched_at) : null,
  };
}
