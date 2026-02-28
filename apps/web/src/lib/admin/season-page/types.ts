import type { AssetSectionKey } from "@/lib/admin/asset-sectioning";

export type TabId =
  | "overview"
  | "episodes"
  | "assets"
  | "news"
  | "fandom"
  | "cast"
  | "surveys"
  | "social";

export type SeasonCastSource = "season_evidence" | "show_fallback";
export type GalleryDiagnosticFilter = "all" | "missing-variants" | "oversized" | "unclassified";

export type RefreshProgressState = {
  stage?: string | null;
  message?: string | null;
  current: number | null;
  total: number | null;
};

export type SeasonRefreshLogLevel = "info" | "success" | "error";
export type SeasonRefreshLogScope = "assets" | "cast" | "cast_enrich" | "image";

export type SeasonRefreshLogEntry = {
  id: number;
  ts: number;
  scope: SeasonRefreshLogScope;
  stage: string;
  message: string;
  detail?: string | null;
  response?: string | null;
  level: SeasonRefreshLogLevel;
  current?: number | null;
  total?: number | null;
};

export type EpisodeCoverageRow = {
  episodeId: string;
  episodeNumber: number;
  title: string | null;
  hasStill: boolean;
  hasDescription: boolean;
  hasAirDate: boolean;
  hasRuntime: boolean;
};

export type BatchJobOperation = "count" | "crop" | "id_text" | "resize";

export type SeasonTab = { id: TabId; label: string; icon?: "home" };

export type SeasonGalleryState = {
  assetsVisibleCount: number;
  assetsTruncatedWarning: string | null;
  selectedSectionKeys: AssetSectionKey[];
};
