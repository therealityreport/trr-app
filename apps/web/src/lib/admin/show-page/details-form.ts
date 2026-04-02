import { resolvePreferredShowRouteSlug } from "@/lib/admin/show-route-slug";
import { slugifyToken } from "@/lib/slugify";

export type ShowDetailsSource = {
  name?: string | null;
  slug?: string | null;
  canonical_slug?: string | null;
  alternative_names?: string[] | null;
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
