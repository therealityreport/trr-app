const normalizeSlugToken = (value: string | null | undefined, fallback: string): string => {
  const normalized = String(value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return normalized || fallback;
};

export const slugifyRedditPostTitle = (value: string | null | undefined): string =>
  normalizeSlugToken(value, "untitled-post");

export const slugifyRedditAuthor = (value: string | null | undefined): string =>
  normalizeSlugToken(value, "unknown-author");

export interface ParsedRedditDetailSlug {
  titleSlug: string;
  authorSlug: string;
  postId: string | null;
  detailSlug: string;
}

export const buildRedditDetailSlugBase = (input: {
  title: string | null | undefined;
  author: string | null | undefined;
}): string => `${slugifyRedditPostTitle(input.title)}--u-${slugifyRedditAuthor(input.author)}`;

export const buildRedditDetailSlug = (input: {
  title: string | null | undefined;
  author: string | null | undefined;
  postId?: string | null;
  collision?: boolean;
}): string => {
  const base = buildRedditDetailSlugBase(input);
  const normalizedPostId = String(input.postId ?? "").trim();
  if (!input.collision || !normalizedPostId) return base;
  return `${base}--p-${normalizedPostId}`;
};

export const parseRedditDetailSlug = (
  value: string | null | undefined,
): ParsedRedditDetailSlug | null => {
  const detailSlug = String(value ?? "").trim().toLowerCase();
  if (!detailSlug) return null;
  const authorSplit = detailSlug.split("--u-");
  if (authorSplit.length !== 2) return null;
  const titleSlug = authorSplit[0]?.trim() ?? "";
  const authorAndPost = authorSplit[1]?.trim() ?? "";
  if (!titleSlug || !authorAndPost) return null;
  const postSplit = authorAndPost.split("--p-");
  const authorSlug = postSplit[0]?.trim() ?? "";
  const postId = postSplit[1]?.trim() || null;
  if (!authorSlug) return null;
  return {
    titleSlug,
    authorSlug,
    postId,
    detailSlug,
  };
};
