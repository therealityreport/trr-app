import { useCallback, useEffect, useRef, useState } from "react";
import { looksLikeUuid } from "@/lib/admin/show-page/constants";
import type { ShowDetailsForm, TabId } from "@/lib/admin/show-page/types";

const DEFAULT_SHOW_DETAILS_FORM: ShowDetailsForm = {
  displayName: "",
  nickname: "",
  altNamesText: "",
  description: "",
  premiereDate: "",
};

export function useShowCore<TShow, TSeason>(showRouteParam: string) {
  const [resolvedShowId, setResolvedShowId] = useState<string | null>(
    looksLikeUuid(showRouteParam) ? showRouteParam : null
  );
  const [slugResolutionLoading, setSlugResolutionLoading] = useState(!looksLikeUuid(showRouteParam));
  const [slugResolutionError, setSlugResolutionError] = useState<string | null>(null);

  const showId = resolvedShowId ?? "";
  const activeShowIdRef = useRef(showId);
  const isCurrentShowId = useCallback(
    (requestShowId: string) => activeShowIdRef.current === requestShowId,
    []
  );

  useEffect(() => {
    activeShowIdRef.current = showId;
  }, [showId]);

  const [show, setShow] = useState<TShow | null>(null);
  const [seasons, setSeasons] = useState<TSeason[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("details");
  const [selectedSocialSeasonId, setSelectedSocialSeasonId] = useState<string | null>(null);
  const [assetsView, setAssetsView] = useState<"images" | "videos" | "brand">("images");
  const [openSeasonId, setOpenSeasonId] = useState<string | null>(null);
  const [seasonEpisodeSummaries, setSeasonEpisodeSummaries] = useState<
    Record<string, { count: number; premiereDate: string | null; finaleDate: string | null }>
  >({});
  const [seasonSummariesLoading, setSeasonSummariesLoading] = useState(false);
  const [socialDependencyError, setSocialDependencyError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailsForm, setDetailsForm] = useState<ShowDetailsForm>(DEFAULT_SHOW_DETAILS_FORM);
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [detailsNotice, setDetailsNotice] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [detailsEditing, setDetailsEditing] = useState(false);

  return {
    resolvedShowId,
    setResolvedShowId,
    slugResolutionLoading,
    setSlugResolutionLoading,
    slugResolutionError,
    setSlugResolutionError,
    showId,
    activeShowIdRef,
    isCurrentShowId,
    show,
    setShow,
    seasons,
    setSeasons,
    activeTab,
    setActiveTab,
    selectedSocialSeasonId,
    setSelectedSocialSeasonId,
    assetsView,
    setAssetsView,
    openSeasonId,
    setOpenSeasonId,
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
    detailsForm,
    setDetailsForm,
    detailsSaving,
    setDetailsSaving,
    detailsNotice,
    setDetailsNotice,
    detailsError,
    setDetailsError,
    detailsEditing,
    setDetailsEditing,
  };
}
