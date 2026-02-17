const HONORIFIC_NAME_TOKENS = new Set([
  "dr",
  "doctor",
  "mr",
  "mrs",
  "ms",
  "miss",
  "sir",
  "lady",
]);

const normalizePersonNameForOwnership = (value: string | null | undefined): string => {
  if (!value) return "";
  return value
    .replace(/\(.*?\)/g, " ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
};

const tokenizePersonNameForOwnership = (value: string | null | undefined): string[] => {
  const tokens = normalizePersonNameForOwnership(value)
    .split(" ")
    .filter(Boolean);
  while (tokens.length > 0 && HONORIFIC_NAME_TOKENS.has(tokens[0])) {
    tokens.shift();
  }
  return tokens;
};

export const extractFandomPageNameFromUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (!host.includes("fandom.com") && !host.includes("wikia.com")) return null;
    const idx = parsed.pathname.indexOf("/wiki/");
    if (idx === -1) return null;
    let slug = parsed.pathname.slice(idx + "/wiki/".length);
    if (slug.includes("/")) slug = slug.split("/")[0];
    slug = decodeURIComponent(slug).replace(/_/g, " ").trim();
    if (!slug || slug.includes(":")) return null;
    if (slug.toLowerCase().endsWith(" gallery")) {
      slug = slug.slice(0, -" gallery".length).trim();
    }
    return slug || null;
  } catch {
    return null;
  }
};

export const extractWikipediaPageNameFromUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.toLowerCase().includes("wikipedia.org")) return null;
    const idx = parsed.pathname.indexOf("/wiki/");
    if (idx === -1) return null;
    let slug = parsed.pathname.slice(idx + "/wiki/".length);
    if (slug.includes("/")) slug = slug.split("/")[0];
    slug = decodeURIComponent(slug).replace(/_/g, " ").trim();
    if (!slug || slug.includes(":")) return null;
    slug = slug.replace(/\s*\(.*?\)\s*$/g, "").trim();
    return slug || null;
  } catch {
    return null;
  }
};

export const extractPersonKnowledgePageNameFromUrl = (
  url: string | null | undefined
): string | null => {
  if (!url) return null;
  const fandomName = extractFandomPageNameFromUrl(url);
  if (fandomName) return fandomName;
  return extractWikipediaPageNameFromUrl(url);
};

export const fandomPersonNameMatches = (
  expected: string | null | undefined,
  candidate: string | null | undefined
): boolean => {
  const expectedTokens = tokenizePersonNameForOwnership(expected);
  const candidateTokens = tokenizePersonNameForOwnership(candidate);
  if (expectedTokens.length === 0 || candidateTokens.length === 0) return false;

  const expectedJoined = expectedTokens.join(" ");
  const candidateJoined = candidateTokens.join(" ");
  if (expectedJoined === candidateJoined) return true;

  if (expectedTokens.length === 1 || candidateTokens.length === 1) {
    return expectedTokens[0] === candidateTokens[0];
  }

  const expectedFirst = expectedTokens[0];
  const expectedLast = expectedTokens[expectedTokens.length - 1];
  const candidateFirst = candidateTokens[0];
  const candidateLast = candidateTokens[candidateTokens.length - 1];

  const lastNameMatches =
    expectedLast === candidateLast ||
    (expectedLast.length >= 4 &&
      candidateLast.length >= 4 &&
      (expectedLast.startsWith(candidateLast) || candidateLast.startsWith(expectedLast)));
  if (!lastNameMatches) return false;

  if (expectedFirst === candidateFirst) return true;
  if (
    expectedFirst.length >= 3 &&
    candidateFirst.length >= 3 &&
    (expectedFirst.startsWith(candidateFirst) || candidateFirst.startsWith(expectedFirst))
  ) {
    return true;
  }

  return false;
};

export const castFandomRowMatchesExpectedPerson = (
  expectedPersonName: string | null | undefined,
  row: {
    full_name?: string | null;
    page_title?: string | null;
    source_url?: string | null;
  }
): boolean => {
  if (!expectedPersonName) return true;
  const sourceOwnerName = extractPersonKnowledgePageNameFromUrl(row.source_url);
  if (sourceOwnerName && !fandomPersonNameMatches(expectedPersonName, sourceOwnerName)) {
    return false;
  }
  return (
    fandomPersonNameMatches(expectedPersonName, row.full_name) ||
    fandomPersonNameMatches(expectedPersonName, row.page_title) ||
    (sourceOwnerName ? fandomPersonNameMatches(expectedPersonName, sourceOwnerName) : false)
  );
};

const normalizeGenderToken = (value: string | null | undefined): "male" | "female" | null => {
  const normalized = normalizePersonNameForOwnership(value);
  if (!normalized) return null;
  if (normalized.includes("female") || normalized === "f") return "female";
  if (normalized.includes("male") || normalized === "m") return "male";
  return null;
};

export const resolveParentRelationLabel = ({
  gender,
  hasSpouseLikeRole,
  parentCount,
}: {
  gender: string | null;
  hasSpouseLikeRole: boolean;
  parentCount: number;
}): "Mom" | "Dad" | "Parent" => {
  const normalizedGender = normalizeGenderToken(gender);
  if (normalizedGender === "female") return "Mom";
  if (normalizedGender === "male") return "Dad";
  if (hasSpouseLikeRole) return "Dad";
  if (parentCount > 1) return "Mom";
  return "Parent";
};

export const resolveSiblingRelationLabel = (
  gender: string | null
): "Brother" | "Sister" | "Sibling" => {
  const normalizedGender = normalizeGenderToken(gender);
  if (normalizedGender === "female") return "Sister";
  if (normalizedGender === "male") return "Brother";
  return "Sibling";
};

export const isFandomPhotoOwnedByExpectedPerson = (params: {
  source: string | null | undefined;
  sourcePageUrl?: string | null;
  sourceUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  peopleNames?: string[] | null;
  expectedPersonName?: string | null;
}): boolean => {
  const sourceLower = (params.source ?? "").trim().toLowerCase();
  if (sourceLower !== "fandom") return true;
  if (!params.expectedPersonName) return true;

  const metadata = params.metadata ?? {};
  const metadataSourcePageUrl =
    typeof metadata.source_page_url === "string" ? metadata.source_page_url : null;
  const metadataSourcePageUrlAlt =
    typeof metadata.sourcePageUrl === "string" ? metadata.sourcePageUrl : null;
  const metadataSourceUrl = typeof metadata.source_url === "string" ? metadata.source_url : null;
  const metadataSourceUrlAlt = typeof metadata.sourceUrl === "string" ? metadata.sourceUrl : null;
  const candidateNames = [
    extractFandomPageNameFromUrl(params.sourcePageUrl),
    extractFandomPageNameFromUrl(metadataSourcePageUrl),
    extractFandomPageNameFromUrl(metadataSourcePageUrlAlt),
    extractFandomPageNameFromUrl(params.sourceUrl),
    extractFandomPageNameFromUrl(metadataSourceUrl),
    extractFandomPageNameFromUrl(metadataSourceUrlAlt),
    ...(params.peopleNames ?? []),
  ]
    .map((name) => (typeof name === "string" ? name.trim() : ""))
    .filter(Boolean);

  if (candidateNames.length === 0) return true;
  return candidateNames.some((candidate) =>
    fandomPersonNameMatches(params.expectedPersonName, candidate)
  );
};
