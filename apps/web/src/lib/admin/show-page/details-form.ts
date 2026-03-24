import { slugifyToken } from "@/lib/slugify";

export type ShowDetailsSource = {
  name?: string | null;
  slug?: string | null;
  alternative_names?: string[] | null;
};

export const deriveShowDetailsNickname = (show: ShowDetailsSource | null | undefined): string =>
  typeof show?.slug === "string" ? show.slug.trim() : "";

export const deriveShowDetailsAlternativeNames = (show: ShowDetailsSource | null | undefined): string[] => {
  const nickname = deriveShowDetailsNickname(show).toLowerCase();
  const displayName = typeof show?.name === "string" ? show.name.trim().toLowerCase() : "";
  const excluded = new Set([nickname, displayName].filter((value) => value.length > 0));
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of Array.isArray(show?.alternative_names) ? show.alternative_names : []) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (excluded.has(key) || seen.has(key)) continue;
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
  const excluded = new Set(
    [canonicalNickname.toLowerCase(), displayName.trim().toLowerCase()].filter((value) => value.length > 0)
  );
  const seen = new Set<string>();
  const out: string[] = [];

  if (canonicalNickname) {
    seen.add(canonicalNickname.toLowerCase());
    out.push(canonicalNickname);
  }

  for (const raw of alternativeNames) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (excluded.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }

  return out;
};
