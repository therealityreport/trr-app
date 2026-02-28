/**
 * Reddit OAuth2 client for authenticated API access.
 *
 * Uses Reddit's "Application Only" OAuth2 flow (client_credentials) to
 * obtain an access token that grants 60 requests/minute instead of the
 * unauthenticated public API's ~10 requests/minute.
 *
 * Required env vars:
 *   REDDIT_CLIENT_ID     – OAuth app client ID from https://www.reddit.com/prefs/apps
 *   REDDIT_CLIENT_SECRET – OAuth app client secret
 *
 * When credentials are missing, falls back to unauthenticated mode
 * (www.reddit.com with no Authorization header).
 */

const DEFAULT_USER_AGENT = "TRRAdminRedditDiscovery/1.0 (+https://thereality.report)";
const TOKEN_SAFETY_MARGIN_MS = 60_000;
const TOKEN_FETCH_TIMEOUT_MS = 10_000;

interface CachedToken {
  accessToken: string;
  expiresAtMs: number;
}

let cachedToken: CachedToken | null = null;
let pendingTokenPromise: Promise<CachedToken | null> | null = null;

const getClientId = (): string | null => {
  const value = (process.env.REDDIT_CLIENT_ID ?? "").trim();
  return value.length > 0 ? value : null;
};

const getClientSecret = (): string | null => {
  const value = (process.env.REDDIT_CLIENT_SECRET ?? "").trim();
  return value.length > 0 ? value : null;
};

const getUserAgent = (): string =>
  (process.env.REDDIT_USER_AGENT ?? "").trim() || DEFAULT_USER_AGENT;

/**
 * Whether Reddit OAuth credentials are configured.
 */
export const isRedditOAuthConfigured = (): boolean =>
  getClientId() !== null && getClientSecret() !== null;

/**
 * Fetch a new application-only access token from Reddit.
 */
const fetchAccessToken = async (): Promise<CachedToken | null> => {
  const clientId = getClientId();
  const clientSecret = getClientSecret();
  if (!clientId || !clientSecret) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TOKEN_FETCH_TIMEOUT_MS);

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const response = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": getUserAgent(),
      },
      body: "grant_type=client_credentials",
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("[reddit_oauth] Token request failed", {
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }

    const payload = (await response.json()) as {
      access_token?: string;
      token_type?: string;
      expires_in?: number;
    };

    if (!payload.access_token) {
      console.error("[reddit_oauth] No access_token in response", payload);
      return null;
    }

    const expiresInMs = ((payload.expires_in ?? 3600) * 1000) - TOKEN_SAFETY_MARGIN_MS;
    const token: CachedToken = {
      accessToken: payload.access_token,
      expiresAtMs: Date.now() + expiresInMs,
    };

    console.info("[reddit_oauth] Token acquired", {
      expires_in: payload.expires_in,
      token_type: payload.token_type,
    });

    return token;
  } catch (error) {
    const isAbort = (error as { name?: string } | null)?.name === "AbortError";
    console.error("[reddit_oauth] Token fetch failed", {
      error: isAbort ? "timeout" : error instanceof Error ? error.message : "unknown",
    });
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

/**
 * Get a valid Reddit OAuth access token, fetching or refreshing as needed.
 * Returns null if OAuth is not configured or token fetch fails.
 *
 * Uses deduplication so concurrent callers share one in-flight token request.
 */
export const getRedditAccessToken = async (): Promise<string | null> => {
  if (!isRedditOAuthConfigured()) return null;

  if (cachedToken && cachedToken.expiresAtMs > Date.now()) {
    return cachedToken.accessToken;
  }

  if (pendingTokenPromise) {
    const result = await pendingTokenPromise;
    return result?.accessToken ?? null;
  }

  pendingTokenPromise = fetchAccessToken();
  try {
    const token = await pendingTokenPromise;
    cachedToken = token;
    return token?.accessToken ?? null;
  } finally {
    pendingTokenPromise = null;
  }
};

export interface RedditFetchContext {
  /** Base URL: oauth.reddit.com (authenticated) or www.reddit.com (fallback) */
  baseUrl: string;
  /** Headers to include with every Reddit API request */
  headers: Record<string, string>;
}

/**
 * Build the fetch context (base URL + headers) for Reddit API calls.
 *
 * When OAuth is configured and a token is available, uses oauth.reddit.com
 * with a Bearer token. Otherwise falls back to the public JSON API.
 */
export const getRedditFetchContext = async (): Promise<RedditFetchContext> => {
  const userAgent = getUserAgent();
  const accessToken = await getRedditAccessToken();

  if (accessToken) {
    return {
      baseUrl: "https://oauth.reddit.com",
      headers: {
        Accept: "application/json",
        "User-Agent": userAgent,
        Authorization: `Bearer ${accessToken}`,
      },
    };
  }

  return {
    baseUrl: "https://www.reddit.com",
    headers: {
      Accept: "application/json",
      "User-Agent": userAgent,
    },
  };
};

/**
 * Invalidate the cached token (e.g. on 401 response).
 */
export const invalidateRedditToken = (): void => {
  cachedToken = null;
};
