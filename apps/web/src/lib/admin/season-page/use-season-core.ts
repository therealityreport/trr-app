import { useRef, useState } from "react";
import { looksLikeUuid } from "@/lib/admin/season-page/constants";
import type { TabId } from "@/lib/admin/season-page/types";

export function useSeasonCore<TShow, TSeason, TEpisode>(
  showRouteParam: string,
  seasonNumber: string
) {
  const [resolvedShowId, setResolvedShowId] = useState<string | null>(
    looksLikeUuid(showRouteParam) ? showRouteParam : null
  );
  const [slugResolutionLoading, setSlugResolutionLoading] = useState(!looksLikeUuid(showRouteParam));
  const [slugResolutionError, setSlugResolutionError] = useState<string | null>(null);

  const showId = resolvedShowId ?? "";
  const activeSeasonRequestKeyRef = useRef(`${showId}:${seasonNumber}`);
  const seasonLoadRequestIdRef = useRef(0);

  const [show, setShow] = useState<TShow | null>(null);
  const [season, setSeason] = useState<TSeason | null>(null);
  const [showSeasons, setShowSeasons] = useState<TSeason[]>([]);
  const [episodes, setEpisodes] = useState<TEpisode[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [assetsView, setAssetsView] = useState<"media" | "brand">("media");
  const [allowPlaceholderMediaOverride, setAllowPlaceholderMediaOverride] = useState(false);
  const [galleryDiagnosticsOpen, setGalleryDiagnosticsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seasonSupplementalWarning, setSeasonSupplementalWarning] = useState<string | null>(null);

  return {
    resolvedShowId,
    setResolvedShowId,
    slugResolutionLoading,
    setSlugResolutionLoading,
    slugResolutionError,
    setSlugResolutionError,
    showId,
    activeSeasonRequestKeyRef,
    seasonLoadRequestIdRef,
    show,
    setShow,
    season,
    setSeason,
    showSeasons,
    setShowSeasons,
    episodes,
    setEpisodes,
    activeTab,
    setActiveTab,
    assetsView,
    setAssetsView,
    allowPlaceholderMediaOverride,
    setAllowPlaceholderMediaOverride,
    galleryDiagnosticsOpen,
    setGalleryDiagnosticsOpen,
    loading,
    setLoading,
    error,
    setError,
    seasonSupplementalWarning,
    setSeasonSupplementalWarning,
  };
}
