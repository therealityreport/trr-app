import { useCallback, useState } from "react";
import { adminGetJson } from "@/lib/admin/admin-fetch";
import type { TrrPerson } from "@/lib/admin/person-page/types";

type UsePersonProfileControllerOptions = {
  personId: string;
  getAuthHeaders: () => Promise<HeadersInit>;
  onError: (message: string | null) => void;
};

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === "AbortError";

export function usePersonProfileController({
  personId,
  getAuthHeaders,
  onError,
}: UsePersonProfileControllerOptions) {
  const [person, setPerson] = useState<TrrPerson | null>(null);

  const fetchPerson = useCallback(
    async (options?: { signal?: AbortSignal }) => {
      if (!personId) return null;
      const signal = options?.signal;
      if (signal?.aborted) return null;
      try {
        const headers = await getAuthHeaders();
        if (signal?.aborted) return null;
        const data = await adminGetJson<{ person?: TrrPerson | null }>(
          `/api/admin/trr-api/people/${personId}?request_role=primary`,
          {
            headers,
            externalSignal: signal,
            requestRole: "primary",
            dedupeKey: `person:${personId}:detail`,
          },
        );
        if (signal?.aborted) return null;
        const nextPerson = data.person ?? null;
        setPerson(nextPerson);
        onError(null);
        return nextPerson;
      } catch (err) {
        if (signal?.aborted || isAbortError(err)) return null;
        onError(err instanceof Error ? err.message : "Failed to load person");
        return null;
      }
    },
    [getAuthHeaders, onError, personId],
  );

  return {
    person,
    setPerson,
    fetchPerson,
  };
}
