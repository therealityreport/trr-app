import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import {
  SOCIAL_ACCOUNT_PLATFORM_LABELS,
  type SocialAccountProfileTab,
  type SocialPlatformSlug,
  type SocialProfileCookieHealth,
  type SocialProfileCookieRefreshResult,
} from "@/lib/admin/social-account-profile";
import {
  INSTAGRAM_AUTH_REFRESH_WARNING,
  refreshProfileCookies,
  requestCookieHealth,
  type SocialProfileApi,
} from "./profile-api";

const buildCommentsAuthCookieHealthProbeKey = (
  platform: string,
  handle: string,
  cookieHealth: SocialProfileCookieHealth,
): string => {
  const fingerprint = String(cookieHealth.cookie_fingerprint || "").trim();
  const sourcePath = String(cookieHealth.source_path || "").trim();
  return [platform, handle, fingerprint || "no-fingerprint", cookieHealth.source_kind || "", sourcePath].join(":");
};

const COOKIE_HEALTH_SESSION_CACHE_TTL_MS = 5 * 60 * 1000;

const buildCookieHealthSessionCacheKey = (platform: string, handle: string): string =>
  `trr-social-cookie-health:${platform.toLowerCase()}:${handle.toLowerCase()}`;

const hasCommentsAuthProbe = (cookieHealth: SocialProfileCookieHealth): boolean =>
  Boolean(cookieHealth.comments_auth_health || cookieHealth.comments_auth_probe);

const readCookieHealthSessionCache = (input: {
  platform: string;
  handle: string;
  needsCommentsAuth: boolean;
}): SocialProfileCookieHealth | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(buildCookieHealthSessionCacheKey(input.platform, input.handle));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      cached_at?: unknown;
      cookie_health?: unknown;
    };
    if (typeof parsed.cached_at !== "number") return null;
    if (Date.now() - parsed.cached_at > COOKIE_HEALTH_SESSION_CACHE_TTL_MS) return null;
    if (!parsed.cookie_health || typeof parsed.cookie_health !== "object") return null;
    const cookieHealth = parsed.cookie_health as SocialProfileCookieHealth;
    if (input.needsCommentsAuth && !hasCommentsAuthProbe(cookieHealth)) return null;
    return cookieHealth;
  } catch {
    return null;
  }
};

const writeCookieHealthSessionCache = (
  platform: string,
  handle: string,
  cookieHealth: SocialProfileCookieHealth,
): void => {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      buildCookieHealthSessionCacheKey(platform, handle),
      JSON.stringify({
        cached_at: Date.now(),
        cookie_health: cookieHealth,
      }),
    );
  } catch {
    // A disabled or full sessionStorage should not block the live health check.
  }
};

type CookieHealthInput = {
  platform: SocialPlatformSlug;
  handle: string;
  selectedTab: SocialAccountProfileTab;
  user: User | null;
  checking: boolean;
  hasAccess: boolean;
  hasCurrentSummary: boolean;
  platformRequiresCookies: boolean;
  shouldDeferSecondaryCatalogReads: boolean;
  secondaryReadBudgetSlot: number;
  fetchAdminWithAuth: SocialProfileApi;
  pauseSecondaryReadsForPressure: (error: unknown, fallbackReason: string) => boolean;
};

export function useProfileCookieHealth({
  platform, handle, selectedTab, user, checking, hasAccess, hasCurrentSummary,
  platformRequiresCookies, shouldDeferSecondaryCatalogReads, secondaryReadBudgetSlot,
  fetchAdminWithAuth, pauseSecondaryReadsForPressure,
}: CookieHealthInput) {
  const [cookieHealth, setCookieHealth] = useState<SocialProfileCookieHealth | null>(null);
  const [cookieHealthLoading, setCookieHealthLoading] = useState(false);
  const [cookieHealthError, setCookieHealthError] = useState<string | null>(null);
  const [cookieRefreshing, setCookieRefreshing] = useState(false);
  const [cookieRefreshMessage, setCookieRefreshMessage] = useState<string | null>(null);
  const [cookieRefreshConfirmationPending, setCookieRefreshConfirmationPending] = useState(false);
  const commentsAuthCookieHealthProbeKeyRef = useRef<string | null>(null);

  const resetCookieHealthState = useCallback(() => {
    setCookieHealth(null);
    setCookieHealthLoading(false);
    setCookieHealthError(null);
    setCookieRefreshing(false);
    setCookieRefreshMessage(null);
    setCookieRefreshConfirmationPending(false);
    commentsAuthCookieHealthProbeKeyRef.current = null;
  }, []);

  // --- Cookie preflight: fetch health on load for cookie-dependent platforms ---
  const fetchCookieHealth = useCallback(
    async (
      force = false,
      options: { includePostsAuth?: boolean; includeCommentsAuth?: boolean } = {},
    ): Promise<SocialProfileCookieHealth | null> => {
      if (!platformRequiresCookies || !user) return null;
      const commentsAuthRequested = platform === "instagram" && selectedTab === "comments";
      if (!force) {
        const cachedCookieHealth = readCookieHealthSessionCache({
          platform,
          handle,
          needsCommentsAuth: commentsAuthRequested,
        });
        if (cachedCookieHealth) {
          setCookieHealth(cachedCookieHealth);
          setCookieHealthError(null);
          if (commentsAuthRequested) {
            commentsAuthCookieHealthProbeKeyRef.current = buildCommentsAuthCookieHealthProbeKey(
              platform,
              handle,
              cachedCookieHealth,
            );
          }
          return cachedCookieHealth;
        }
      }
      setCookieHealthLoading(true);
      setCookieHealthError(null);
      try {
        const data = await requestCookieHealth({
          fetchAdminWithAuth, user, platform, handle, force, commentsAuthRequested, options,
        });
        setCookieHealth(data);
        writeCookieHealthSessionCache(platform, handle, data);
        if (commentsAuthRequested) {
          commentsAuthCookieHealthProbeKeyRef.current = buildCommentsAuthCookieHealthProbeKey(platform, handle, data);
        }
        return data;
      } catch (error) {
        pauseSecondaryReadsForPressure(error, "Failed to check cookie health");
        setCookieHealthError(error instanceof Error ? error.message : "Cookie health check failed");
        return null;
      } finally {
        setCookieHealthLoading(false);
      }
    },
    [platformRequiresCookies, user, platform, handle, selectedTab, fetchAdminWithAuth, pauseSecondaryReadsForPressure],
  );

  const handleCookieRefresh = useCallback(async (options: { confirmed?: boolean } = {}): Promise<{
    refreshResult: SocialProfileCookieRefreshResult | null;
    refreshedHealth: SocialProfileCookieHealth | null;
  }> => {
    if (!user) {
      return { refreshResult: null, refreshedHealth: null };
    }
    const refreshAction = cookieHealth?.refresh_action || (platform === "instagram" ? "instagram_auth_repair" : "cookie_refresh");
    const refreshLabel =
      cookieHealth?.refresh_label ||
      (refreshAction === "instagram_auth_repair" ? "Manual Instagram Auth" : "Refresh Cookies");
    const requiresInstagramConfirmation = platform === "instagram" && refreshAction === "instagram_auth_repair";
    if (requiresInstagramConfirmation && !options.confirmed) {
      setCookieRefreshConfirmationPending(true);
      setCookieRefreshMessage(INSTAGRAM_AUTH_REFRESH_WARNING);
      return { refreshResult: null, refreshedHealth: null };
    }
    setCookieRefreshing(true);
    setCookieRefreshConfirmationPending(false);
    setCookieRefreshMessage(
      refreshAction === "instagram_auth_repair"
        ? "Checking manual Instagram auth state and syncing only already validated cookies."
        : "Opening browser… Log in to " + SOCIAL_ACCOUNT_PLATFORM_LABELS[platform] + " in the browser window.",
    );
    try {
      const data = await refreshProfileCookies({
        fetchAdminWithAuth, user, platform, handle, requiresInstagramConfirmation,
      });
      const refreshedHealth = await fetchCookieHealth(true);
      if (data.success) {
        setCookieRefreshMessage(
          refreshAction === "instagram_auth_repair"
            ? "Validated Instagram cookies synced."
            : `${refreshLabel} completed successfully.`,
        );
      } else {
        setCookieRefreshMessage(
          refreshAction === "instagram_auth_repair"
            ? `Manual Instagram auth check completed but health is still invalid: ${data.reason || "unknown"}`
            : `Refresh completed but cookies may still be invalid: ${data.reason || "unknown"}`,
        );
      }
      return { refreshResult: data, refreshedHealth };
    } catch (error) {
      setCookieRefreshMessage(error instanceof Error ? error.message : "Cookie refresh failed");
      return { refreshResult: null, refreshedHealth: null };
    } finally {
      setCookieRefreshing(false);
    }
  }, [cookieHealth?.refresh_action, cookieHealth?.refresh_label, fetchAdminWithAuth, fetchCookieHealth, handle, platform, user]);

  return {
    resetCookieHealthState,
    cookieHealthPreflight: {
      platform,
      handle,
      selectedTab,
      user,
      checking,
      hasAccess,
      hasCurrentSummary,
      platformRequiresCookies,
      shouldDeferSecondaryCatalogReads,
      secondaryReadBudgetSlot,
      cookieHealth,
      cookieHealthLoading,
      fetchCookieHealth,
      commentsAuthCookieHealthProbeKeyRef,
    },
    cookieHealth,
    cookieHealthLoading,
    cookieHealthError,
    cookieRefreshing,
    cookieRefreshMessage,
    cookieRefreshConfirmationPending,
    setCookieRefreshMessage,
    setCookieRefreshConfirmationPending,
    fetchCookieHealth,
    handleCookieRefresh,
  };
}

// Keep automatic preflight at the parent's existing effect position so earlier
// primary-read and pressure effects settle before this secondary read.
type CookieHealthPreflightInput = Pick<
  CookieHealthInput,
  "platform" | "handle" | "selectedTab" | "user" | "checking" | "hasAccess" |
  "hasCurrentSummary" | "platformRequiresCookies" | "shouldDeferSecondaryCatalogReads" |
  "secondaryReadBudgetSlot"
> & {
  cookieHealth: SocialProfileCookieHealth | null;
  cookieHealthLoading: boolean;
  fetchCookieHealth: ReturnType<typeof useProfileCookieHealth>["fetchCookieHealth"];
  commentsAuthCookieHealthProbeKeyRef: RefObject<string | null>;
};

export function useProfileCookieHealthPreflight({
  platform,
  handle,
  selectedTab,
  user,
  checking,
  hasAccess,
  hasCurrentSummary,
  platformRequiresCookies,
  shouldDeferSecondaryCatalogReads,
  secondaryReadBudgetSlot,
  cookieHealth,
  cookieHealthLoading,
  fetchCookieHealth,
  commentsAuthCookieHealthProbeKeyRef,
}: CookieHealthPreflightInput): void {
  useEffect(() => {
    const commentsAuthProbeMissing =
      platform === "instagram" &&
      selectedTab === "comments" &&
      Boolean(cookieHealth) &&
      !cookieHealth?.comments_auth_health &&
      !cookieHealth?.comments_auth_probe;
    const commentsAuthProbeKey =
      commentsAuthProbeMissing && cookieHealth
        ? buildCommentsAuthCookieHealthProbeKey(platform, handle, cookieHealth)
        : null;
    const commentsAuthProbeAlreadyRequested =
      Boolean(commentsAuthProbeKey) && commentsAuthCookieHealthProbeKeyRef.current === commentsAuthProbeKey;
    if (
      checking ||
      !user ||
      !hasAccess ||
      !hasCurrentSummary ||
      !platformRequiresCookies ||
      shouldDeferSecondaryCatalogReads ||
      secondaryReadBudgetSlot < 3 ||
      (commentsAuthProbeMissing && commentsAuthProbeAlreadyRequested) ||
      (cookieHealth && !commentsAuthProbeMissing) ||
      cookieHealthLoading
    ) {
      return;
    }
    if (platformRequiresCookies && user && (!cookieHealth || commentsAuthProbeMissing) && !cookieHealthLoading) {
      void fetchCookieHealth(commentsAuthProbeMissing, {
        includeCommentsAuth: platform === "instagram" && selectedTab === "comments",
        includePostsAuth: false,
      });
    }
  }, [
    checking,
    commentsAuthCookieHealthProbeKeyRef,
    cookieHealth,
    cookieHealthLoading,
    fetchCookieHealth,
    hasAccess,
    handle,
    hasCurrentSummary,
    platform,
    platformRequiresCookies,
    selectedTab,
    secondaryReadBudgetSlot,
    shouldDeferSecondaryCatalogReads,
    user,
  ]);

}
