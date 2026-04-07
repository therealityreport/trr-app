import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchWithTimeout } from "@/lib/admin/admin-fetch";
import {
  buildCanonicalShowAlternativeNames,
  buildShowDetailsFormValue,
  deriveShowDetailsSlugPreview,
  normalizeShowDetailsEditorText,
  parseShowDetailsEditorList,
  type ShowDetailsFormSource,
} from "@/lib/admin/show-page/details-form";
import type { ShowDetailsForm } from "@/lib/admin/show-page/types";
import { SETTINGS_MUTATION_TIMEOUT_MS } from "@/lib/admin/show-page/constants";

type UseShowDetailsControllerOptions<TShow extends ShowDetailsFormSource> = {
  show: TShow | null;
  showId: string;
  getAuthHeaders: () => Promise<HeadersInit>;
  onShowUpdated: (show: TShow) => void;
};

export function useShowDetailsController<TShow extends ShowDetailsFormSource>({
  show,
  showId,
  getAuthHeaders,
  onShowUpdated,
}: UseShowDetailsControllerOptions<TShow>) {
  const [detailsForm, setDetailsForm] = useState<ShowDetailsForm>(() => buildShowDetailsFormValue(show));
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailsNotice, setDetailsNotice] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsEditing, setDetailsEditing] = useState(false);

  const detailsBaseline = useMemo(() => buildShowDetailsFormValue(show), [show]);

  useEffect(() => {
    setDetailsForm(buildShowDetailsFormValue(show));
  }, [show]);

  const hasUnsavedDetailsChanges = useMemo(() => {
    if (!detailsEditing) return false;

    return (
      detailsForm.displayName.trim() !== detailsBaseline.displayName.trim() ||
      detailsForm.nickname.trim() !== detailsBaseline.nickname.trim() ||
      detailsForm.description.trim() !== detailsBaseline.description.trim() ||
      detailsForm.premiereDate.trim() !== detailsBaseline.premiereDate.trim() ||
      detailsForm.imdbId.trim() !== detailsBaseline.imdbId.trim() ||
      detailsForm.tmdbId.trim() !== detailsBaseline.tmdbId.trim() ||
      detailsForm.tvdbId.trim() !== detailsBaseline.tvdbId.trim() ||
      detailsForm.wikidataId.trim() !== detailsBaseline.wikidataId.trim() ||
      detailsForm.tvRageId.trim() !== detailsBaseline.tvRageId.trim() ||
      normalizeShowDetailsEditorText(detailsForm.genresText) !==
        normalizeShowDetailsEditorText(detailsBaseline.genresText) ||
      normalizeShowDetailsEditorText(detailsForm.networksText) !==
        normalizeShowDetailsEditorText(detailsBaseline.networksText) ||
      normalizeShowDetailsEditorText(detailsForm.streamingProvidersText) !==
        normalizeShowDetailsEditorText(detailsBaseline.streamingProvidersText) ||
      normalizeShowDetailsEditorText(detailsForm.tagsText) !==
        normalizeShowDetailsEditorText(detailsBaseline.tagsText) ||
      normalizeShowDetailsEditorText(detailsForm.altNamesText) !==
        normalizeShowDetailsEditorText(detailsBaseline.altNamesText)
    );
  }, [detailsBaseline, detailsEditing, detailsForm]);

  const startDetailsEdit = useCallback(() => {
    setDetailsNotice(null);
    setDetailsError(null);
    setDetailsEditing(true);
  }, []);

  const cancelDetailsEdit = useCallback(() => {
    setDetailsForm(buildShowDetailsFormValue(show));
    setDetailsNotice(null);
    setDetailsError(null);
    setDetailsEditing(false);
  }, [show]);

  const saveShowDetails = useCallback(async () => {
    if (!show || !showId) return;

    const displayName = detailsForm.displayName.trim();
    if (!displayName) {
      setDetailsError("Display Name is required.");
      return;
    }

    const nickname = detailsForm.nickname.trim();
    const canonicalNickname = deriveShowDetailsSlugPreview(nickname);
    if (!canonicalNickname) {
      setDetailsError("Nickname must produce a valid slug.");
      return;
    }

    const alternativeNames = parseShowDetailsEditorList(detailsForm.altNamesText);
    const genres = parseShowDetailsEditorList(detailsForm.genresText);
    const networks = parseShowDetailsEditorList(detailsForm.networksText);
    const streamingProviders = parseShowDetailsEditorList(detailsForm.streamingProvidersText);
    const tags = parseShowDetailsEditorList(detailsForm.tagsText);
    const canonicalAlternativeNames = buildCanonicalShowAlternativeNames({
      displayName,
      nickname,
      alternativeNames,
    });

    setDetailsSaving(true);
    setDetailsError(null);
    setDetailsNotice(null);

    try {
      const headers = await getAuthHeaders();
      const response = await fetchWithTimeout(
        `/api/admin/trr-api/shows/${showId}`,
        {
          method: "PUT",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({
            name: displayName,
            nickname: canonicalNickname,
            alternative_names: canonicalAlternativeNames,
            description: detailsForm.description.trim() || "",
            premiere_date: detailsForm.premiereDate || "",
            imdb_id: detailsForm.imdbId.trim() || "",
            tmdb_id: detailsForm.tmdbId.trim() || "",
            tvdb_id: detailsForm.tvdbId.trim() || "",
            wikidata_id: detailsForm.wikidataId.trim() || "",
            tv_rage_id: detailsForm.tvRageId.trim() || "",
            genres,
            networks,
            streaming_providers: streamingProviders,
            tags,
          }),
        },
        SETTINGS_MUTATION_TIMEOUT_MS
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          (data as { error?: string }).error ||
          `Failed to save show details (HTTP ${response.status})`;
        throw new Error(message);
      }

      const nextShow = (data as { show?: TShow }).show ?? null;
      if (nextShow) {
        onShowUpdated(nextShow);
      }
      setDetailsNotice("Show details saved.");
      setDetailsEditing(false);
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : "Failed to save show details");
    } finally {
      setDetailsSaving(false);
    }
  }, [detailsForm, getAuthHeaders, onShowUpdated, show, showId]);

  return {
    detailsForm,
    detailsBaseline,
    setDetailsForm,
    detailsSaving,
    detailsNotice,
    detailsError,
    detailsEditing,
    setDetailsEditing,
    hasUnsavedDetailsChanges,
    startDetailsEdit,
    cancelDetailsEdit,
    saveShowDetails,
  };
}
