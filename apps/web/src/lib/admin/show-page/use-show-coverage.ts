import { useCallback, useState } from "react";
import { adminGetJson, adminMutation } from "@/lib/admin/admin-fetch";
import { COVERAGE_MUTATION_TIMEOUT_MS } from "@/lib/admin/show-page/constants";

const SHOW_CORE_LOAD_TIMEOUT_MS = process.env.NODE_ENV === "development" ? 60_000 : 15_000;

type UseShowCoverageOptions = {
  showId: string;
  showName: string | null | undefined;
  getAuthHeaders: () => Promise<HeadersInit>;
  isCurrentShowId: (requestShowId: string) => boolean;
};

export function useShowCoverage({
  showId,
  showName,
  getAuthHeaders,
  isCurrentShowId,
}: UseShowCoverageOptions) {
  const [isCovered, setIsCovered] = useState(false);
  const [coverageLoading, setCoverageLoading] = useState(false);
  const [coverageError, setCoverageError] = useState<string | null>(null);

  const checkCoverage = useCallback(async () => {
    const requestShowId = showId;
    if (!requestShowId) return;

    try {
      const headers = await getAuthHeaders();
      await adminGetJson(`/api/admin/covered-shows/${requestShowId}`, {
        headers,
        timeoutMs: SHOW_CORE_LOAD_TIMEOUT_MS,
      });
      if (!isCurrentShowId(requestShowId)) return;
      setIsCovered(true);
      setCoverageError(null);
    } catch {
      if (!isCurrentShowId(requestShowId)) return;
      setIsCovered(false);
    }
  }, [getAuthHeaders, isCurrentShowId, showId]);

  const addToCoveredShows = useCallback(async () => {
    if (!showId || !showName) return;

    setCoverageLoading(true);
    setCoverageError(null);
    try {
      const headers = await getAuthHeaders();
      await adminMutation<{ error?: string }>("/api/admin/covered-shows", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ trr_show_id: showId, show_name: showName }),
        timeoutMs: COVERAGE_MUTATION_TIMEOUT_MS,
      });
      setIsCovered(true);
    } catch (err) {
      setCoverageError(err instanceof Error ? err.message : "Failed to add show visibility");
    } finally {
      setCoverageLoading(false);
    }
  }, [getAuthHeaders, showId, showName]);

  const removeFromCoveredShows = useCallback(async () => {
    if (!showId) return;

    setCoverageLoading(true);
    setCoverageError(null);
    try {
      const headers = await getAuthHeaders();
      await adminMutation<{ error?: string }>(`/api/admin/covered-shows/${showId}`, {
        method: "DELETE",
        headers,
        timeoutMs: COVERAGE_MUTATION_TIMEOUT_MS,
      });
      setIsCovered(false);
    } catch (err) {
      setCoverageError(err instanceof Error ? err.message : "Failed to remove show visibility");
    } finally {
      setCoverageLoading(false);
    }
  }, [getAuthHeaders, showId]);

  return {
    isCovered,
    coverageLoading,
    coverageError,
    checkCoverage,
    addToCoveredShows,
    removeFromCoveredShows,
  };
}
