import { useCallback, useEffect } from "react";
import { AdminRequestError, adminGetJson, fetchWithTimeout } from "@/lib/admin/admin-fetch";
import { looksLikeUuid } from "@/lib/admin/show-page/constants";
import { useShowCore } from "@/lib/admin/show-page/use-show-core";

const SHOW_CORE_LOAD_TIMEOUT_MS = process.env.NODE_ENV === "development" ? 60_000 : 15_000;

const isTransientNotAuthenticatedError = (error: unknown): boolean =>
  error instanceof Error && error.message.toLowerCase().includes("not authenticated");

type SeasonEpisodeSummaryState = {
  count: number;
  premiereDate: string | null;
  finaleDate: string | null;
};

type UseShowIdentityLoadOptions<TSeason> = {
  checking: boolean;
  hasAccess: boolean;
  showRouteParam: string;
  getAuthHeaders: () => Promise<HeadersInit>;
  buildSeasonEpisodeSummaryMap: (seasonList: TSeason[]) => Record<string, SeasonEpisodeSummaryState>;
};

export function useShowIdentityLoad<TShow, TSeason>({
  checking,
  hasAccess,
  showRouteParam,
  getAuthHeaders,
  buildSeasonEpisodeSummaryMap,
}: UseShowIdentityLoadOptions<TSeason>) {
  const {
    setResolvedShowId,
    slugResolutionLoading,
    setSlugResolutionLoading,
    slugResolutionError,
    setSlugResolutionError,
    showId,
    isCurrentShowId,
    show,
    setShow,
    seasons,
    setSeasons,
    seasonEpisodeSummaries,
    setSeasonEpisodeSummaries,
    seasonSummariesLoading,
    setSeasonSummariesLoading,
    socialDependencyError,
    setSocialDependencyError,
    loading,
    setLoading,
    error,
    setError,
  } = useShowCore<TShow, TSeason>(showRouteParam);

  useEffect(() => {
    if (checking || !hasAccess) return;

    const raw = typeof showRouteParam === "string" ? showRouteParam.trim() : "";
    if (!raw) {
      setResolvedShowId(null);
      setSlugResolutionLoading(false);
      setSlugResolutionError("Missing show identifier.");
      return;
    }

    if (looksLikeUuid(raw)) {
      setResolvedShowId(raw);
      setSlugResolutionLoading(false);
      setSlugResolutionError(null);
      return;
    }

    let cancelled = false;

    const resolveSlug = async () => {
      setSlugResolutionLoading(true);
      setSlugResolutionError(null);

      try {
        for (let attempt = 0; attempt < 4; attempt += 1) {
          try {
            const headers = await getAuthHeaders();
            const response = await fetchWithTimeout(
              `/api/admin/trr-api/shows/resolve-slug?slug=${encodeURIComponent(raw)}`,
              { headers, cache: "no-store" },
              SHOW_CORE_LOAD_TIMEOUT_MS
            );
            const data = (await response.json().catch(() => ({}))) as {
              error?: string;
              resolved?: { show_id?: string | null };
            };
            if (!response.ok) {
              throw new Error(data.error || "Failed to resolve show slug");
            }

            const nextShowId =
              typeof data.resolved?.show_id === "string" && looksLikeUuid(data.resolved.show_id)
                ? data.resolved.show_id
                : null;
            if (!nextShowId) {
              throw new Error("Resolved show slug did not return a valid show id.");
            }

            if (cancelled) return;
            setResolvedShowId(nextShowId);
            return;
          } catch (err) {
            if (cancelled) return;
            if (isTransientNotAuthenticatedError(err) && attempt < 3) {
              await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 250));
              continue;
            }
            setResolvedShowId(null);
            setSlugResolutionError(
              err instanceof Error ? err.message : "Could not resolve show URL slug."
            );
            return;
          }
        }
      } catch (err) {
        if (cancelled) return;
        setResolvedShowId(null);
        setSlugResolutionError(
          err instanceof Error ? err.message : "Could not resolve show URL slug."
        );
      } finally {
        if (!cancelled) setSlugResolutionLoading(false);
      }
    };

    void resolveSlug();
    return () => {
      cancelled = true;
    };
  }, [
    checking,
    getAuthHeaders,
    hasAccess,
    setResolvedShowId,
    setSlugResolutionError,
    setSlugResolutionLoading,
    showRouteParam,
  ]);

  const fetchShow = useCallback(async () => {
    const requestShowId = showId;
    if (!requestShowId) return;

    try {
      const headers = await getAuthHeaders();
      const data = await adminGetJson<{ show?: TShow }>(
        `/api/admin/trr-api/shows/${requestShowId}`,
        {
          headers,
          timeoutMs: SHOW_CORE_LOAD_TIMEOUT_MS,
        }
      );
      if (!isCurrentShowId(requestShowId)) return;
      setShow(data.show ?? null);
      setError(null);
    } catch (err) {
      if (!isCurrentShowId(requestShowId)) return;
      const message =
        err instanceof AdminRequestError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to load show";
      setError(message);
    }
  }, [getAuthHeaders, isCurrentShowId, setError, setShow, showId]);

  const fetchSeasons = useCallback(async () => {
    const requestShowId = showId;
    if (!requestShowId) return;

    try {
      const headers = await getAuthHeaders();
      const data = await adminGetJson<{ seasons?: TSeason[] }>(
        `/api/admin/trr-api/shows/${requestShowId}/seasons?limit=50&include_episode_signal=true`,
        {
          headers,
          timeoutMs: SHOW_CORE_LOAD_TIMEOUT_MS,
        }
      );
      const nextSeasons = Array.isArray(data.seasons) ? data.seasons : [];
      if (!isCurrentShowId(requestShowId)) return;
      setSeasons(nextSeasons);
      setSeasonEpisodeSummaries(buildSeasonEpisodeSummaryMap(nextSeasons));
      setSeasonSummariesLoading(false);
      setSocialDependencyError(null);
    } catch (err) {
      if (!isCurrentShowId(requestShowId)) return;
      const message = err instanceof Error ? err.message : "Failed to fetch seasons";
      console.warn("Failed to fetch seasons:", message);
      setSocialDependencyError(message);
    }
  }, [
    buildSeasonEpisodeSummaryMap,
    getAuthHeaders,
    isCurrentShowId,
    setSeasonEpisodeSummaries,
    setSeasonSummariesLoading,
    setSeasons,
    setSocialDependencyError,
    showId,
  ]);

  const loadShowIdentity = useCallback(
    async (extraTasks: Array<() => Promise<unknown> | void> = []) => {
      const requestShowId = showId;
      if (!requestShowId) return;
      if (!isCurrentShowId(requestShowId)) return;

      setLoading(true);
      try {
        await fetchShow();
        await Promise.allSettled([
          fetchSeasons(),
          ...extraTasks.map((task) => Promise.resolve().then(() => task())),
        ]);
      } finally {
        if (!isCurrentShowId(requestShowId)) return;
        setLoading(false);
      }
    },
    [fetchSeasons, fetchShow, isCurrentShowId, setLoading, showId]
  );

  return {
    slugResolutionLoading,
    slugResolutionError,
    showId,
    isCurrentShowId,
    show,
    setShow,
    seasons,
    seasonEpisodeSummaries,
    setSeasonEpisodeSummaries,
    seasonSummariesLoading,
    setSeasonSummariesLoading,
    socialDependencyError,
    loading,
    error,
    fetchShow,
    fetchSeasons,
    loadShowIdentity,
  };
}
