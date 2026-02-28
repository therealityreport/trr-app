import "server-only";
import { toCanonicalFlairKey } from "@/lib/reddit/flair-key";

const RHOSLC_SUBREDDIT = "realhousewivesofslc";
const RHOSLC_REMOVE_TOKEN = ":whitney:";
const TOKEN_MARKER_RE = /:[^:\s]+:/g;
const LEADING_DECOR_RE = /^[^\p{L}\p{N}]+/u;
const TRAILING_DECOR_RE = /[^\p{L}\p{N}]+$/u;

const collapseWhitespace = (value: string): string => value.replace(/\s+/g, " ").trim();

const normalizeSubredditInput = (value: string): string => {
  let cleaned = value.trim();
  cleaned = cleaned.replace(/^https?:\/\/(?:www\.)?reddit\.com\/r\//i, "");
  cleaned = cleaned.replace(/^r\//i, "");
  cleaned = cleaned.replace(/^\/+|\/+$/g, "");
  cleaned = cleaned.split(/[/?#]/, 1)[0] ?? cleaned;
  return cleaned.toLowerCase();
};

const stripEdgeDecorators = (value: string): string => {
  let next = value;
  let previous = "";
  while (next !== previous) {
    previous = next;
    next = next.replace(LEADING_DECOR_RE, "").replace(TRAILING_DECOR_RE, "");
  }
  return next;
};

const toHeadlineWord = (word: string): string => {
  const upper = word.toUpperCase();
  if (upper === "RHOSLC" || upper === "HW") return upper;
  if (/^S\d+$/i.test(word)) return upper;
  if (word.length <= 1) return upper;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
};

const headlineCaseIfAllCaps = (value: string): string => {
  if (!/[A-Za-z]/.test(value) || value !== value.toUpperCase()) {
    return value;
  }
  return value
    .split(" ")
    .map((token) => token.replace(/[A-Za-z0-9]+/g, (word) => toHeadlineWord(word)))
    .join(" ");
};

const normalizeGenericFlair = (raw: string): string | null => {
  const next = collapseWhitespace(raw);
  return next.length > 0 ? next : null;
};

const normalizeRhoslcFlair = (raw: string): string | null => {
  if (raw.toLowerCase().includes(RHOSLC_REMOVE_TOKEN)) {
    return null;
  }

  let next = collapseWhitespace(raw);
  next = next.replace(TOKEN_MARKER_RE, " ");
  next = collapseWhitespace(next);
  next = stripEdgeDecorators(next);
  next = collapseWhitespace(next);
  next = headlineCaseIfAllCaps(next);
  return next.length > 0 ? next : null;
};

export const normalizeRedditFlairLabel = (
  subreddit: string,
  rawFlair: string,
): string | null => {
  const key = normalizeSubredditInput(subreddit);
  if (key === RHOSLC_SUBREDDIT) {
    return normalizeRhoslcFlair(rawFlair);
  }
  return normalizeGenericFlair(rawFlair);
};

export const sanitizeRedditFlairList = (subreddit: string, rawFlares: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of rawFlares) {
    if (typeof raw !== "string") continue;
    const normalized = normalizeRedditFlairLabel(subreddit, raw);
    if (!normalized) continue;
    const key = toCanonicalFlairKey(normalized);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
  }

  out.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  return out;
};

export const normalizeSubredditKey = (value: string): string => normalizeSubredditInput(value);
