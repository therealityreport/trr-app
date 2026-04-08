import { resolvePreferredShowRouteSlug } from "@/lib/admin/show-route-slug";
import type { ShowDetailsForm } from "@/lib/admin/show-page/types";
import { slugifyToken } from "@/lib/slugify";

export type ShowDetailsSource = {
  name?: string | null;
  slug?: string | null;
  canonical_slug?: string | null;
  alternative_names?: string[] | null;
};

export type ShowDetailsFormSource = ShowDetailsSource & {
  description?: string | null;
  premiere_date?: string | null;
  imdb_id?: string | null;
  tmdb_id?: number | null;
  external_ids?: Record<string, unknown> | null;
  genres?: string[] | null;
  networks?: string[] | null;
  streaming_providers?: string[] | null;
  watch_providers?: string[] | null;
  tags?: string[] | null;
};

export const deriveShowDetailsNickname = (show: ShowDetailsSource | null | undefined): string => {
  if (!show) return "";
  const hasSlugCandidate =
    typeof show.slug === "string" ||
    typeof show.canonical_slug === "string" ||
    Array.isArray(show.alternative_names);
  if (!hasSlugCandidate) return "";
  return resolvePreferredShowRouteSlug({
    alternativeNames: show.alternative_names,
    canonicalSlug: show.canonical_slug,
    slug: show.slug,
  });
};

export const deriveShowDetailsAlternativeNames = (show: ShowDetailsSource | null | undefined): string[] => {
  const nickname = deriveShowDetailsNickname(show).trim();
  const displayName = typeof show?.name === "string" ? show.name.trim().toLowerCase() : "";
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of Array.isArray(show?.alternative_names) ? show.alternative_names : []) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (key === displayName || trimmed === nickname || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }

  return out;
};

export const deriveShowDetailsSlugPreview = (nickname: string): string => slugifyToken(nickname.trim());

export const parseShowDetailsEditorList = (value: string): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of value.split(/\r?\n|,/)) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }

  return out;
};

export const normalizeShowDetailsEditorText = (value: string): string =>
  parseShowDetailsEditorList(value).join("\n");

export const buildCanonicalShowAlternativeNames = ({
  displayName,
  nickname,
  alternativeNames,
}: {
  displayName: string;
  nickname: string;
  alternativeNames: string[];
}): string[] => {
  const canonicalNickname = slugifyToken(nickname.trim());
  const canonicalNicknameKey = canonicalNickname.toLowerCase();
  const excludedDisplayName = displayName.trim().toLowerCase();
  const seen = new Set<string>();
  const out: string[] = [];
  let preservedPreferredAlias: string | null = null;

  if (canonicalNickname) {
    out.push(canonicalNickname);
  }

  for (const raw of alternativeNames) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (key === excludedDisplayName || trimmed === canonicalNickname) continue;
    if (key === canonicalNicknameKey) {
      if (!preservedPreferredAlias) preservedPreferredAlias = trimmed;
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }

  if (preservedPreferredAlias) {
    out.splice(canonicalNickname ? 1 : 0, 0, preservedPreferredAlias);
  }

  return out;
};

const toDelimitedEditorText = (value: string[] | null | undefined): string =>
  Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item.trim().length > 0).join("\n")
    : "";

const readShowExternalId = (
  show: Pick<ShowDetailsFormSource, "external_ids" | "imdb_id" | "tmdb_id"> | null,
  key: string
): string => {
  if (!show) return "";
  if (key === "imdb_id") return typeof show.imdb_id === "string" ? show.imdb_id : "";
  if (key === "tmdb_id") return typeof show.tmdb_id === "number" ? String(show.tmdb_id) : "";
  const value = show.external_ids && typeof show.external_ids === "object" ? show.external_ids[key] : null;
  if (value === null || value === undefined) return "";
  return String(value);
};

export const buildShowDetailsFormValue = (
  show: ShowDetailsFormSource | null | undefined
): ShowDetailsForm => {
  if (!show) {
    return {
      displayName: "",
      nickname: "",
      altNamesText: "",
      description: "",
      premiereDate: "",
      imdbId: "",
      tmdbId: "",
      tvdbId: "",
      wikidataId: "",
      tvRageId: "",
      genresText: "",
      networksText: "",
      streamingProvidersText: "",
      tagsText: "",
    };
  }

  return {
    displayName: show.name ?? "",
    nickname: deriveShowDetailsNickname(show),
    altNamesText: deriveShowDetailsAlternativeNames(show).join("\n"),
    description: show.description ?? "",
    premiereDate: show.premiere_date ?? "",
    imdbId: readShowExternalId(show, "imdb_id"),
    tmdbId: readShowExternalId(show, "tmdb_id"),
    tvdbId: readShowExternalId(show, "tvdb_id"),
    wikidataId: readShowExternalId(show, "wikidata_id"),
    tvRageId: readShowExternalId(show, "tv_rage_id"),
    genresText: toDelimitedEditorText(show.genres),
    networksText: toDelimitedEditorText(show.networks),
    streamingProvidersText: toDelimitedEditorText(
      (Array.isArray(show.streaming_providers) ? show.streaming_providers : null) ??
        (Array.isArray(show.watch_providers) ? show.watch_providers : [])
    ),
    tagsText: toDelimitedEditorText(show.tags),
  };
};
