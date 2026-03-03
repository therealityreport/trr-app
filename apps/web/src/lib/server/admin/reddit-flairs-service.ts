import { sanitizeRedditFlairList } from "@/lib/server/admin/reddit-flair-normalization";
import {
  getRedditFetchContext,
  invalidateRedditToken,
} from "@/lib/server/admin/reddit-oauth-client";

export type RedditFlairSource = "api" | "listing_fallback" | "none";

export interface RedditPostFlairsResult {
  flairs: string[];
  source: RedditFlairSource;
  warning: string | null;
}

type RedditListingSort = "new" | "hot" | "top";

interface RedditListingPayload {
  data?: {
    children?: Array<{
      data?: {
        link_flair_text?: string | null;
      };
    }>;
  };
}

interface RedditFlairTemplate {
  text?: string | null;
}

const SORTS: RedditListingSort[] = ["new", "hot", "top"];
const SUBREDDIT_RE = /^[A-Za-z0-9_]{2,21}$/;
const DEFAULT_FETCH_TIMEOUT_MS = 12_000;
const DEFAULT_FLAIR_CAP = 40;
const DEFAULT_LISTING_LIMIT = 60;

const normalizeSubreddit = (value: string): string => {
  let cleaned = value.trim();
  cleaned = cleaned.replace(/^https?:\/\/(?:www\.)?reddit\.com\/r\//i, "");
  cleaned = cleaned.replace(/^r\//i, "");
  cleaned = cleaned.replace(/^\/+|\/+$/g, "");
  cleaned = cleaned.split(/[/?#]/, 1)[0] ?? cleaned;
  return cleaned;
};

const isValidSubreddit = (value: string): boolean => SUBREDDIT_RE.test(value);

const toWarning = (error: unknown): string => {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return "Failed to load subreddit post flairs";
};

const getTimeoutMs = (): number => {
  const parsed = Number.parseInt(process.env.REDDIT_FETCH_TIMEOUT_MS ?? "", 10);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return DEFAULT_FETCH_TIMEOUT_MS;
};

const getFlairCap = (): number => {
  const parsed = Number.parseInt(process.env.REDDIT_FLAIR_CAP ?? "", 10);
  if (Number.isFinite(parsed) && parsed > 0) return Math.min(parsed, 200);
  return DEFAULT_FLAIR_CAP;
};

const getListingLimit = (): number => {
  const parsed = Number.parseInt(process.env.REDDIT_FLAIR_LISTING_LIMIT ?? "", 10);
  if (Number.isFinite(parsed) && parsed > 0) return Math.min(parsed, 100);
  return DEFAULT_LISTING_LIMIT;
};

const fetchJsonWithTimeout = async <T>(url: string): Promise<T> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs());
  const ctx = await getRedditFetchContext();

  try {
    const response = await fetch(url, {
      headers: ctx.headers,
      signal: controller.signal,
      cache: "no-store",
    });

    if (response.status === 401 && ctx.headers.Authorization) {
      invalidateRedditToken();
    }
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Subreddit not found");
      }
      if (response.status === 429) {
        throw new Error("Reddit rate limit hit while loading post flairs");
      }
      throw new Error(`Reddit request failed (${response.status})`);
    }
    return (await response.json()) as T;
  } catch (error) {
    if ((error as { name?: string } | null)?.name === "AbortError") {
      throw new Error("Reddit request timed out while loading post flairs");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const rankAndCapFlairs = (subreddit: string, rawFlairs: string[], cap: number): string[] => {
  const firstSeenOrder = new Map<string, number>();
  const displayByKey = new Map<string, string>();
  const countByKey = new Map<string, number>();

  for (const raw of rawFlairs) {
    const normalized = raw.trim().replace(/\s+/g, " ");
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (!firstSeenOrder.has(key)) {
      firstSeenOrder.set(key, firstSeenOrder.size);
      displayByKey.set(key, normalized);
    }
    countByKey.set(key, (countByKey.get(key) ?? 0) + 1);
  }

  const sortedKeys = [...countByKey.keys()].sort((a, b) => {
    const countDiff = (countByKey.get(b) ?? 0) - (countByKey.get(a) ?? 0);
    if (countDiff !== 0) return countDiff;
    const alphaDiff = (displayByKey.get(a) ?? a).localeCompare(displayByKey.get(b) ?? b);
    if (alphaDiff !== 0) return alphaDiff;
    return (firstSeenOrder.get(a) ?? 0) - (firstSeenOrder.get(b) ?? 0);
  });

  const ranked = sortedKeys.map((key) => displayByKey.get(key) ?? key);
  return sanitizeRedditFlairList(subreddit, ranked).slice(0, cap);
};

const fetchFromFlairApi = async (subreddit: string): Promise<string[]> => {
  const ctx = await getRedditFetchContext();
  const payload = await fetchJsonWithTimeout<RedditFlairTemplate[]>(
    `${ctx.baseUrl}/r/${encodeURIComponent(subreddit)}/api/link_flair_v2.json?raw_json=1`,
  );

  if (!Array.isArray(payload)) return [];
  const flairs = payload
    .map((entry) => (typeof entry?.text === "string" ? entry.text : ""))
    .filter((value) => value.trim().length > 0);
  return rankAndCapFlairs(subreddit, flairs, getFlairCap());
};

const fetchFromListingsFallback = async (subreddit: string): Promise<string[]> => {
  const perSortLimit = getListingLimit();
  const ctx = await getRedditFetchContext();

  const listingRows = await Promise.all(
    SORTS.map(async (sort) => {
      const params = new URLSearchParams({ raw_json: "1", limit: String(perSortLimit) });
      if (sort === "top") params.set("t", "month");
      const payload = await fetchJsonWithTimeout<RedditListingPayload>(
        `${ctx.baseUrl}/r/${encodeURIComponent(subreddit)}/${sort}.json?${params.toString()}`,
      );
      return payload.data?.children ?? [];
    }),
  );

  const rawFlairs: string[] = [];
  for (const rows of listingRows) {
    for (const row of rows) {
      const flair = row.data?.link_flair_text;
      if (typeof flair === "string" && flair.trim().length > 0) {
        rawFlairs.push(flair);
      }
    }
  }

  return rankAndCapFlairs(subreddit, rawFlairs, getFlairCap());
};

export async function fetchSubredditPostFlairs(subredditInput: string): Promise<RedditPostFlairsResult> {
  const subreddit = normalizeSubreddit(subredditInput);
  if (!subreddit || !isValidSubreddit(subreddit)) {
    throw new Error("Invalid subreddit");
  }

  try {
    const apiFlairs = await fetchFromFlairApi(subreddit);
    if (apiFlairs.length > 0) {
      return {
        flairs: apiFlairs,
        source: "api",
        warning: null,
      };
    }
  } catch (error) {
    const warning = toWarning(error);
    try {
      const fallbackFlairs = await fetchFromListingsFallback(subreddit);
      if (fallbackFlairs.length > 0) {
        return {
          flairs: fallbackFlairs,
          source: "listing_fallback",
          warning,
        };
      }
      return {
        flairs: [],
        source: "none",
        warning,
      };
    } catch {
      return {
        flairs: [],
        source: "none",
        warning,
      };
    }
  }

  try {
    const fallbackFlairs = await fetchFromListingsFallback(subreddit);
    if (fallbackFlairs.length > 0) {
      return {
        flairs: fallbackFlairs,
        source: "listing_fallback",
        warning: "Flair API returned no post flairs",
      };
    }
  } catch (error) {
    return {
      flairs: [],
      source: "none",
      warning: toWarning(error),
    };
  }

  return {
    flairs: [],
    source: "none",
    warning: null,
  };
}
