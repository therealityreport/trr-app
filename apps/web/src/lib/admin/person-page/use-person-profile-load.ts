import { useEffect, useState } from "react";
import type { TrrPerson } from "@/lib/admin/person-page/types";

type UsePersonProfileLoadOptions = {
  hasAccess: boolean;
  personId: string;
  fetchPerson: (options?: { signal?: AbortSignal }) => Promise<TrrPerson | null>;
  setLoading: (value: boolean) => void;
};

export function usePersonProfileLoad({
  hasAccess,
  personId,
  fetchPerson,
  setLoading,
}: UsePersonProfileLoadOptions) {
  const [personProfileReady, setPersonProfileReady] = useState(false);

  useEffect(() => {
    if (!hasAccess) return;
    if (!personId) return;

    let cancelled = false;
    const controller = new AbortController();
    const { signal } = controller;

    const loadPerson = async () => {
      setLoading(true);
      try {
        setPersonProfileReady(false);
        await fetchPerson({ signal });
        if (!cancelled && !signal.aborted) {
          setPersonProfileReady(true);
        }
      } finally {
        if (!cancelled && !signal.aborted) {
          setLoading(false);
        }
      }
    };

    void loadPerson();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [fetchPerson, hasAccess, personId, setLoading]);

  return {
    personProfileReady,
  };
}
