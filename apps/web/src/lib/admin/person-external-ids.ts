export const PERSON_EXTERNAL_ID_SOURCES = [
  "imdb",
  "tmdb",
  "wikidata",
  "tvdb",
  "tvrage",
  "fandom",
  "facebook",
  "instagram",
  "twitter",
  "tiktok",
  "youtube",
] as const;

export type PersonExternalIdSource = (typeof PERSON_EXTERNAL_ID_SOURCES)[number];

export type PersonExternalIdRecord = {
  id: number | null;
  source_id: PersonExternalIdSource;
  external_id: string;
  is_primary: boolean;
  valid_from: string | null;
  valid_to: string | null;
  observed_at: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type PersonExternalIdInput = {
  source_id: PersonExternalIdSource;
  external_id: string;
  valid_from?: string | null;
  valid_to?: string | null;
  is_primary?: boolean;
};

const URL_PREFIX_RE = /^https?:\/\//i;

const SOURCE_LABELS: Record<PersonExternalIdSource, string> = {
  imdb: "IMDb",
  tmdb: "TMDb",
  wikidata: "Wikidata",
  tvdb: "TVDb",
  tvrage: "TV Rage",
  fandom: "Fandom",
  facebook: "Facebook",
  instagram: "Instagram",
  twitter: "Twitter/X",
  tiktok: "TikTok",
  youtube: "YouTube",
};

export const getPersonExternalIdSourceLabel = (source: PersonExternalIdSource): string =>
  SOURCE_LABELS[source];

export const isPersonExternalIdSource = (value: string): value is PersonExternalIdSource =>
  (PERSON_EXTERNAL_ID_SOURCES as readonly string[]).includes(value);

const trimOrNull = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseUrlOrNull = (value: string): URL | null => {
  if (!URL_PREFIX_RE.test(value)) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const trimPathSegments = (pathname: string): string[] =>
  pathname
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);

const normalizeImdbValue = (value: string): string => {
  const trimmed = value.trim();
  const parsed = parseUrlOrNull(trimmed);
  const candidates = parsed ? trimPathSegments(parsed.pathname) : [];
  const matchedCandidate = candidates.find((segment) => /^nm\d+$/i.test(segment));
  if (matchedCandidate) return matchedCandidate.toLowerCase();
  const inlineMatch = trimmed.match(/nm\d+/i);
  return inlineMatch ? inlineMatch[0].toLowerCase() : trimmed;
};

const normalizeWikidataValue = (value: string): string => {
  const trimmed = value.trim();
  const parsed = parseUrlOrNull(trimmed);
  const candidates = parsed ? trimPathSegments(parsed.pathname) : [];
  const matchedCandidate = [...candidates].reverse().find((segment) => /^[PQ]\d+$/i.test(segment));
  const inlineMatch = trimmed.match(/[PQ]\d+/i);
  const normalized = matchedCandidate ?? inlineMatch?.[0] ?? trimmed;
  if (/^[PQ]\d+$/i.test(normalized)) {
    return `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`;
  }
  return normalized;
};

const normalizeFandomValue = (value: string): string => {
  const trimmed = value.trim();
  const parsed = parseUrlOrNull(trimmed);
  if (!parsed) return trimmed;
  const pathname = parsed.pathname.replace(/\/+$/g, "");
  return `${parsed.origin}${pathname || "/"}`;
};

const normalizeSocialPathValue = (source: PersonExternalIdSource, value: string): string => {
  const trimmed = value.trim();
  const parsed = parseUrlOrNull(trimmed);
  if (!parsed) {
    return trimmed;
  }

  const pathSegments = trimPathSegments(parsed.pathname);
  if (source === "facebook") {
    if (pathSegments[0]?.toLowerCase() === "profile.php") {
      return parsed.searchParams.get("id")?.trim() || trimmed;
    }
    if (pathSegments[0]?.toLowerCase() === "people" && pathSegments[2]) {
      return pathSegments[2];
    }
    if (pathSegments[0]?.toLowerCase() === "pg" && pathSegments[1]) {
      return pathSegments[1];
    }
    return pathSegments[0] ?? trimmed;
  }

  if (source === "twitter") {
    return parsed.searchParams.get("screen_name")?.trim() || pathSegments[0] || trimmed;
  }

  if (source === "instagram") {
    return pathSegments[0] ?? trimmed;
  }

  if (source === "tiktok") {
    const first = pathSegments[0] ?? trimmed;
    if (first.startsWith("@")) return first.replace(/^@+/, "");
    if (first.toLowerCase() === "@" && pathSegments[1]) return pathSegments[1].replace(/^@+/, "");
    return first.replace(/^@+/, "");
  }

  if (source === "youtube") {
    const [first, second] = pathSegments;
    if (!first) return trimmed;
    if (first.startsWith("@")) return first;
    if (first.toLowerCase() === "channel" && second) return second;
    if ((first.toLowerCase() === "user" || first.toLowerCase() === "c") && second) {
      return `${first.toLowerCase()}/${second}`;
    }
    return second || first;
  }

  return trimmed;
};

export const normalizePersonExternalIdValue = (
  source: PersonExternalIdSource,
  value: string,
): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";

  switch (source) {
    case "imdb":
      return normalizeImdbValue(trimmed);
    case "wikidata":
      return normalizeWikidataValue(trimmed);
    case "fandom":
      return normalizeFandomValue(trimmed);
    case "tmdb":
    case "tvdb":
    case "tvrage": {
      const digitsOnly = trimmed.replace(/[^\d]/g, "");
      return digitsOnly || trimmed;
    }
    case "facebook":
    case "instagram":
    case "twitter":
    case "tiktok": {
      return normalizeSocialPathValue(source, trimmed).replace(/^@+/, "");
    }
    case "youtube": {
      const normalized = normalizeSocialPathValue(source, trimmed);
      if (normalized.startsWith("@")) return normalized;
      return normalized;
    }
    default:
      return trimmed;
  }
};

const buildSocialUrl = (source: PersonExternalIdSource, value: string): string | null => {
  const normalized = normalizePersonExternalIdValue(source, value);
  if (!normalized) return null;

  switch (source) {
    case "facebook":
      return `https://www.facebook.com/${normalized}`;
    case "instagram":
      return `https://www.instagram.com/${normalized}`;
    case "twitter":
      return `https://x.com/${normalized}`;
    case "tiktok":
      return `https://www.tiktok.com/@${normalized}`;
    case "youtube":
      if (normalized.startsWith("@")) {
        return `https://www.youtube.com/${normalized}`;
      }
      if (normalized.toUpperCase().startsWith("UC")) {
        return `https://www.youtube.com/channel/${normalized}`;
      }
      if (normalized.startsWith("user/") || normalized.startsWith("c/")) {
        return `https://www.youtube.com/${normalized}`;
      }
      return `https://www.youtube.com/@${normalized.replace(/^@+/, "")}`;
    default:
      return null;
  }
};

export const buildPersonExternalIdUrl = (
  source: PersonExternalIdSource,
  value: string | null | undefined,
): string | null => {
  const trimmed = trimOrNull(value);
  if (!trimmed) return null;
  const normalized = normalizePersonExternalIdValue(source, trimmed);
  if (!normalized) return null;

  switch (source) {
    case "imdb":
      return `https://www.imdb.com/name/${normalized}/`;
    case "tmdb":
      return `https://www.themoviedb.org/person/${normalized}`;
    case "wikidata":
      return `https://www.wikidata.org/wiki/${normalized}`;
    case "tvdb":
      return `https://thetvdb.com/people/${normalized}`;
    case "fandom":
      return URL_PREFIX_RE.test(normalized) ? normalized : null;
    case "facebook":
    case "instagram":
    case "twitter":
    case "tiktok":
    case "youtube":
      return buildSocialUrl(source, normalized);
    case "tvrage":
      return null;
    default:
      return null;
  }
};

const coerceNumericIdentifier = (value: string): number | string => {
  if (!/^\d+$/.test(value)) return value;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : value;
};

export const buildLegacyExternalIdsFromRecords = (
  records: PersonExternalIdRecord[],
): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  for (const record of records) {
    if (!record.is_primary || record.valid_to) continue;
    const normalizedValue = normalizePersonExternalIdValue(record.source_id, record.external_id);
    if (!normalizedValue) continue;

    switch (record.source_id) {
      case "imdb":
      case "wikidata":
      case "fandom":
        result[record.source_id] = normalizedValue;
        result[`${record.source_id}_id`] = normalizedValue;
        break;
      case "tmdb":
      case "tvdb":
      case "tvrage": {
        const coerced = coerceNumericIdentifier(normalizedValue);
        result[record.source_id] = coerced;
        result[`${record.source_id}_id`] = coerced;
        break;
      }
      case "facebook":
      case "instagram":
      case "twitter":
      case "tiktok":
      case "youtube":
        result[record.source_id] = normalizedValue;
        result[`${record.source_id}_id`] = normalizedValue;
        break;
    }
  }

  return result;
};
