import { useCallback, useEffect, useMemo, useState } from "react";
import type { PersonExternalIdDraft } from "@/components/admin/PersonExternalIdsEditor";
import type { PersonExternalIdRecord } from "@/lib/admin/person-external-ids";
import {
  createEmptyExternalIdDraft,
  buildExternalIdDraftsFromRecords,
  buildExternalIdRecordsFromPerson,
  readCanonicalSourceOrderFromExternalIds,
  type ChangeExternalIdDraftField,
  type PersonExternalIdSource,
} from "@/lib/admin/person-page/settings";
import type { CanonicalSource, CanonicalSourceOrder, TrrPerson } from "@/lib/admin/person-page/types";

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === "AbortError";

type UsePersonSettingsControllerOptions = {
  personId: string;
  person: TrrPerson | null;
  setPerson: (person: TrrPerson | null) => void;
  fetchPerson: () => Promise<TrrPerson | null>;
  getAuthHeaders: () => Promise<HeadersInit>;
  hasAccess: boolean;
  settingsTabActive: boolean;
  runSecondaryRead: (task: () => Promise<unknown>) => Promise<unknown>;
};

export function usePersonSettingsController({
  personId,
  person,
  setPerson,
  fetchPerson,
  getAuthHeaders,
  hasAccess,
  settingsTabActive,
  runSecondaryRead,
}: UsePersonSettingsControllerOptions) {
  const [externalIdDrafts, setExternalIdDrafts] = useState<PersonExternalIdDraft[]>([]);
  const [externalIdsLoading, setExternalIdsLoading] = useState(false);
  const [externalIdsSaving, setExternalIdsSaving] = useState(false);
  const [externalIdsError, setExternalIdsError] = useState<string | null>(null);
  const [externalIdsNotice, setExternalIdsNotice] = useState<string | null>(null);
  const [canonicalSourceOrder, setCanonicalSourceOrder] = useState<CanonicalSourceOrder>(
    readCanonicalSourceOrderFromExternalIds(person?.external_ids as Record<string, unknown> | null | undefined),
  );
  const [initialCanonicalSourceOrder, setInitialCanonicalSourceOrder] = useState<CanonicalSourceOrder>(
    readCanonicalSourceOrderFromExternalIds(person?.external_ids as Record<string, unknown> | null | undefined),
  );
  const [canonicalSourceOrderSaving, setCanonicalSourceOrderSaving] = useState(false);
  const [canonicalSourceOrderError, setCanonicalSourceOrderError] = useState<string | null>(null);
  const [canonicalSourceOrderNotice, setCanonicalSourceOrderNotice] = useState<string | null>(null);

  useEffect(() => {
    const nextSourceOrder = readCanonicalSourceOrderFromExternalIds(
      person?.external_ids as Record<string, unknown> | null | undefined,
    );
    setCanonicalSourceOrder(nextSourceOrder);
    setInitialCanonicalSourceOrder(nextSourceOrder);
    setCanonicalSourceOrderError(null);
    setCanonicalSourceOrderNotice(null);
  }, [person]);

  const canonicalSourceOrderDirty = useMemo(
    () => canonicalSourceOrder.join("|") !== initialCanonicalSourceOrder.join("|"),
    [canonicalSourceOrder, initialCanonicalSourceOrder],
  );

  const fetchExternalIds = useCallback(
    async (options?: { signal?: AbortSignal; fallbackPerson?: TrrPerson | null }) => {
      if (!personId) return;
      const signal = options?.signal;
      const fallbackPerson = options?.fallbackPerson ?? null;
      if (signal?.aborted) return;
      try {
        setExternalIdsLoading(true);
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/admin/trr-api/people/${personId}/external-ids`, {
          headers,
          signal,
        });
        const data = (await response.json().catch(() => ({}))) as {
          external_ids?: PersonExternalIdRecord[];
          error?: string;
        };
        if (signal?.aborted) return;
        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch external IDs");
        }
        const records =
          Array.isArray(data.external_ids) && data.external_ids.length > 0
            ? data.external_ids
            : buildExternalIdRecordsFromPerson(fallbackPerson);
        setExternalIdDrafts(records.length > 0 ? buildExternalIdDraftsFromRecords(records) : []);
        setExternalIdsError(null);
      } catch (err) {
        if (signal?.aborted || isAbortError(err)) return;
        const fallbackRecords = buildExternalIdRecordsFromPerson(fallbackPerson);
        setExternalIdDrafts(
          fallbackRecords.length > 0 ? buildExternalIdDraftsFromRecords(fallbackRecords) : [],
        );
        setExternalIdsError(err instanceof Error ? err.message : "Failed to load external IDs");
      } finally {
        setExternalIdsLoading(false);
      }
    },
    [getAuthHeaders, personId],
  );

  const saveExternalIds = useCallback(async () => {
    if (!personId) return;
    try {
      setExternalIdsSaving(true);
      setExternalIdsError(null);
      setExternalIdsNotice(null);
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/trr-api/people/${personId}/external-ids`, {
        method: "PUT",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          external_ids: externalIdDrafts
            .map((draft) => ({
              source_id: draft.source_id,
              external_id: draft.external_id,
            }))
            .filter((draft) => draft.external_id.trim().length > 0),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        external_ids?: PersonExternalIdRecord[];
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "Failed to save external IDs");
      }
      const nextRecords = Array.isArray(data.external_ids) ? data.external_ids : [];
      setExternalIdDrafts(nextRecords.length > 0 ? buildExternalIdDraftsFromRecords(nextRecords) : []);
      await fetchPerson();
      setExternalIdsNotice("Saved external IDs.");
    } catch (err) {
      setExternalIdsError(err instanceof Error ? err.message : "Failed to save external IDs");
    } finally {
      setExternalIdsSaving(false);
    }
  }, [externalIdDrafts, fetchPerson, getAuthHeaders, personId]);

  const moveCanonicalSource = useCallback((source: CanonicalSource, direction: "up" | "down") => {
    setCanonicalSourceOrder((prev) => {
      const index = prev.indexOf(source);
      if (index < 0) return prev;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
    setCanonicalSourceOrderError(null);
    setCanonicalSourceOrderNotice(null);
  }, []);

  const resetCanonicalSourceOrder = useCallback(() => {
    setCanonicalSourceOrder([...initialCanonicalSourceOrder]);
    setCanonicalSourceOrderError(null);
    setCanonicalSourceOrderNotice(null);
  }, [initialCanonicalSourceOrder]);

  const saveCanonicalSourceOrder = useCallback(async () => {
    if (!personId) return;
    if (!canonicalSourceOrderDirty || canonicalSourceOrderSaving) return;
    try {
      setCanonicalSourceOrderSaving(true);
      setCanonicalSourceOrderError(null);
      setCanonicalSourceOrderNotice(null);
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/trr-api/people/${personId}`, {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          canonicalProfileSourceOrder: canonicalSourceOrder,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        person?: TrrPerson;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error || "Failed to update canonical source order");
      }
      if (data.person) {
        setPerson(data.person);
        const persistedSourceOrder = readCanonicalSourceOrderFromExternalIds(
          data.person.external_ids as Record<string, unknown> | null | undefined,
        );
        setCanonicalSourceOrder(persistedSourceOrder);
        setInitialCanonicalSourceOrder(persistedSourceOrder);
      } else {
        setInitialCanonicalSourceOrder([...canonicalSourceOrder]);
      }
      setCanonicalSourceOrderNotice("Saved source order.");
    } catch (err) {
      setCanonicalSourceOrderError(
        err instanceof Error ? err.message : "Failed to update source order",
      );
    } finally {
      setCanonicalSourceOrderSaving(false);
    }
  }, [
    canonicalSourceOrder,
    canonicalSourceOrderDirty,
    canonicalSourceOrderSaving,
    getAuthHeaders,
    personId,
    setPerson,
  ]);

  const handleChangeExternalIdDraft = useCallback(
    (index: number, field: ChangeExternalIdDraftField, value: string) => {
      setExternalIdDrafts((prev) =>
        prev.map((draft, draftIndex) =>
          draftIndex === index
            ? {
                ...draft,
                [field]: field === "source_id" ? (value as PersonExternalIdSource) : value,
              }
            : draft,
        ),
      );
      setExternalIdsError(null);
      setExternalIdsNotice(null);
    },
    [],
  );

  const handleAddExternalIdDraft = useCallback(() => {
    setExternalIdDrafts((prev) => [...prev, createEmptyExternalIdDraft()]);
    setExternalIdsError(null);
    setExternalIdsNotice(null);
  }, []);

  const handleRemoveExternalIdDraft = useCallback((index: number) => {
    setExternalIdDrafts((prev) => prev.filter((_, draftIndex) => draftIndex !== index));
    setExternalIdsError(null);
    setExternalIdsNotice(null);
  }, []);

  useEffect(() => {
    if (!settingsTabActive) return;
    if (!hasAccess || !personId || externalIdsLoading || externalIdDrafts.length > 0) return;
    const controller = new AbortController();
    void runSecondaryRead(async () => {
      await fetchExternalIds({ signal: controller.signal, fallbackPerson: person });
    });
    return () => {
      controller.abort();
    };
  }, [
    externalIdDrafts.length,
    externalIdsLoading,
    fetchExternalIds,
    hasAccess,
    person,
    personId,
    runSecondaryRead,
    settingsTabActive,
  ]);

  return {
    externalIdDrafts,
    externalIdsLoading,
    externalIdsSaving,
    externalIdsError,
    externalIdsNotice,
    fetchExternalIds,
    saveExternalIds,
    handleChangeExternalIdDraft,
    handleAddExternalIdDraft,
    handleRemoveExternalIdDraft,
    canonicalSourceOrder,
    canonicalSourceOrderDirty,
    canonicalSourceOrderSaving,
    canonicalSourceOrderError,
    canonicalSourceOrderNotice,
    moveCanonicalSource,
    resetCanonicalSourceOrder,
    saveCanonicalSourceOrder,
  };
}
