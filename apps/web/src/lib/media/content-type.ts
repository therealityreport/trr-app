const CANONICAL_CONTENT_TYPES = [
  "PROMO",
  "CONFESSIONAL",
  "REUNION",
  "INTRO",
  "EPISODE STILL",
  "CAST PHOTOS",
  "PROFILE PICTURE",
  "BACKDROP",
  "POSTER",
  "LOGO",
  "OTHER",
] as const;

export type CanonicalContentType = (typeof CANONICAL_CONTENT_TYPES)[number];

export const CONTENT_TYPE_OPTIONS: readonly CanonicalContentType[] = CANONICAL_CONTENT_TYPES;

const CONTENT_TYPE_LABELS: Record<CanonicalContentType, string> = {
  PROMO: "Promo",
  CONFESSIONAL: "Confessional",
  REUNION: "Reunion",
  INTRO: "Intro",
  "EPISODE STILL": "Episode Still",
  "CAST PHOTOS": "Cast Photos",
  "PROFILE PICTURE": "Profile Picture",
  BACKDROP: "Backdrop",
  POSTER: "Poster",
  LOGO: "Logo",
  OTHER: "Other",
};

const CONTENT_TYPE_ALIASES: Record<string, CanonicalContentType> = {
  PROMO: "PROMO",
  PROMOS: "PROMO",
  PROMOTIONAL: "PROMO",
  "PROMOTIONAL PORTRAITS": "PROMO",
  CONFESSIONAL: "CONFESSIONAL",
  CONFESSIONALS: "CONFESSIONAL",
  REUNION: "REUNION",
  REUNIONS: "REUNION",
  INTRO: "INTRO",
  INTROS: "INTRO",
  "EPISODE STILL": "EPISODE STILL",
  "EPISODE STILLS": "EPISODE STILL",
  EPISODIC: "EPISODE STILL",
  STILL: "EPISODE STILL",
  STILLS: "EPISODE STILL",
  "CAST PHOTO": "CAST PHOTOS",
  "CAST PHOTOS": "CAST PHOTOS",
  "CAST PORTRAIT": "CAST PHOTOS",
  "CAST PORTRAITS": "CAST PHOTOS",
  "PROFILE PICTURE": "PROFILE PICTURE",
  "PROFILE PHOTO": "PROFILE PICTURE",
  PROFILE: "PROFILE PICTURE",
  HEADSHOT: "PROFILE PICTURE",
  BACKDROP: "BACKDROP",
  BACKDROPS: "BACKDROP",
  POSTER: "POSTER",
  POSTERS: "POSTER",
  LOGO: "LOGO",
  LOGOS: "LOGO",
  OTHER: "OTHER",
};

const KIND_TO_CONTENT_TYPE: Record<string, CanonicalContentType> = {
  promo: "PROMO",
  confessional: "CONFESSIONAL",
  reunion: "REUNION",
  intro: "INTRO",
  episode_still: "EPISODE STILL",
  "episode still": "EPISODE STILL",
  still: "EPISODE STILL",
  cast: "CAST PHOTOS",
  cast_photos: "CAST PHOTOS",
  profile: "PROFILE PICTURE",
  profile_picture: "PROFILE PICTURE",
  backdrop: "BACKDROP",
  poster: "POSTER",
  logo: "LOGO",
  other: "OTHER",
};

const normalizeToken = (value: string): string =>
  value
    .trim()
    .toUpperCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

const canonicalFromText = (text: string): CanonicalContentType | null => {
  const normalized = normalizeToken(text);
  if (!normalized) return null;
  const direct = CONTENT_TYPE_ALIASES[normalized];
  if (direct) return direct;
  if (normalized.includes("PROFILE")) return "PROFILE PICTURE";
  if (normalized.includes("HEADSHOT")) return "PROFILE PICTURE";
  if (normalized.includes("CAST")) return "CAST PHOTOS";
  if (normalized.includes("CONFESSIONAL")) return "CONFESSIONAL";
  if (normalized.includes("REUNION")) return "REUNION";
  if (
    normalized.includes("INTRO") ||
    normalized.includes("TAGLINE") ||
    normalized.includes("OPENING") ||
    normalized.includes("THEME SONG") ||
    normalized.includes("CHAPTER CARD") ||
    normalized.includes("TITLE CARD")
  ) {
    return "INTRO";
  }
  if (
    normalized.includes("EPISODE STILL") ||
    normalized.includes("STILL FRAME") ||
    normalized.includes("EPISODE PHOTO") ||
    normalized.includes("EPISODIC STILL")
  ) {
    return "EPISODE STILL";
  }
  if (normalized.includes("PROMO") || normalized.includes("PROMOTIONAL")) return "PROMO";
  if (normalized.includes("BACKDROP")) return "BACKDROP";
  if (normalized.includes("POSTER")) return "POSTER";
  if (normalized.includes("LOGO")) return "LOGO";
  if (normalized.includes("OTHER")) return "OTHER";
  return null;
};

const canonicalFromKind = (kind: string | null | undefined): CanonicalContentType | null => {
  if (!kind) return null;
  const normalized = kind.trim().toLowerCase().replace(/-/g, "_");
  return KIND_TO_CONTENT_TYPE[normalized] ?? null;
};

export function canonicalizeContentTypeToken(
  value: string | null | undefined
): CanonicalContentType | null {
  if (!value) return null;
  return canonicalFromText(value);
}

export function normalizeContentTypeToken(
  value: string | null | undefined,
  fallback: CanonicalContentType = "OTHER"
): CanonicalContentType {
  return canonicalizeContentTypeToken(value) ?? fallback;
}

export function formatContentTypeLabel(value: string | null | undefined): string {
  const canonical = normalizeContentTypeToken(value, "OTHER");
  return CONTENT_TYPE_LABELS[canonical];
}

export function contentTypeToAssetKind(value: string | null | undefined): string {
  const canonical = normalizeContentTypeToken(value, "OTHER");
  switch (canonical) {
    case "PROMO":
      return "promo";
    case "CONFESSIONAL":
      return "confessional";
    case "REUNION":
      return "reunion";
    case "INTRO":
      return "intro";
    case "EPISODE STILL":
      return "episode_still";
    case "CAST PHOTOS":
      return "cast";
    case "PROFILE PICTURE":
      return "profile_picture";
    case "BACKDROP":
      return "backdrop";
    case "POSTER":
      return "poster";
    case "LOGO":
      return "logo";
    default:
      return "other";
  }
}

export function contentTypeToContextType(value: string | null | undefined): string {
  const canonical = normalizeContentTypeToken(value, "OTHER");
  switch (canonical) {
    case "EPISODE STILL":
      return "episode still";
    case "CAST PHOTOS":
      return "cast photos";
    case "PROFILE PICTURE":
      return "profile_picture";
    default:
      return canonical.toLowerCase();
  }
}

export function resolveCanonicalContentType(input: {
  explicitContentType?: string | null;
  fandomSectionTag?: string | null;
  sectionLabel?: string | null;
  imdbType?: string | null;
  contextType?: string | null;
  caption?: string | null;
  kind?: string | null;
}): CanonicalContentType | null {
  const explicit = canonicalizeContentTypeToken(input.explicitContentType);
  if (explicit && explicit !== "OTHER") return explicit;

  const fandomTag = canonicalizeContentTypeToken(input.fandomSectionTag);
  if (fandomTag && fandomTag !== "OTHER") return fandomTag;

  const textCandidates = [
    input.sectionLabel,
    input.imdbType,
    input.contextType,
    input.caption,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(" ");
  const inferredFromText = canonicalFromText(textCandidates);
  if (inferredFromText) return inferredFromText;

  const inferredFromKind = canonicalFromKind(input.kind);
  if (inferredFromKind) return inferredFromKind;

  if (explicit) return explicit;
  if (fandomTag) return fandomTag;
  return null;
}
