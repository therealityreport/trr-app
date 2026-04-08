export interface TrrPerson {
  id: string;
  full_name: string;
  known_for: string | null;
  external_ids: Record<string, unknown>;
  birthday?: Record<string, unknown>;
  gender?: Record<string, unknown>;
  biography?: Record<string, unknown>;
  place_of_birth?: Record<string, unknown>;
  homepage?: Record<string, unknown>;
  profile_image_url?: Record<string, unknown>;
  alternative_names?: Record<string, string[]> | string[];
  created_at: string;
  updated_at: string;
}

export const DEFAULT_CANONICAL_SOURCE_ORDER = ["imdb", "tmdb", "fandom", "manual"] as const;

export type CanonicalSource = (typeof DEFAULT_CANONICAL_SOURCE_ORDER)[number];
export type CanonicalSourceOrder = CanonicalSource[];
