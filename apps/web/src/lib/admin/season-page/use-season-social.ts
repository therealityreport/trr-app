import { useState } from "react";

export function useSeasonSocial<TBravoVideoItem, TFandomData, TFandomSyncPreviewResponse>() {
  const [bravoVideos, setBravoVideos] = useState<TBravoVideoItem[]>([]);
  const [bravoVideosLoading, setBravoVideosLoading] = useState(false);
  const [bravoVideosError, setBravoVideosError] = useState<string | null>(null);
  const [bravoVideoSyncing, setBravoVideoSyncing] = useState(false);
  const [bravoVideoSyncWarning, setBravoVideoSyncWarning] = useState<string | null>(null);

  const [seasonFandomData, setSeasonFandomData] = useState<TFandomData[]>([]);
  const [seasonFandomLoading, setSeasonFandomLoading] = useState(false);
  const [seasonFandomError, setSeasonFandomError] = useState<string | null>(null);
  const [fandomSyncOpen, setFandomSyncOpen] = useState(false);
  const [fandomSyncPreview, setFandomSyncPreview] = useState<TFandomSyncPreviewResponse | null>(null);
  const [fandomSyncPreviewLoading, setFandomSyncPreviewLoading] = useState(false);
  const [fandomSyncCommitLoading, setFandomSyncCommitLoading] = useState(false);
  const [fandomSyncError, setFandomSyncError] = useState<string | null>(null);

  return {
    bravoVideos,
    setBravoVideos,
    bravoVideosLoading,
    setBravoVideosLoading,
    bravoVideosError,
    setBravoVideosError,
    bravoVideoSyncing,
    setBravoVideoSyncing,
    bravoVideoSyncWarning,
    setBravoVideoSyncWarning,
    seasonFandomData,
    setSeasonFandomData,
    seasonFandomLoading,
    setSeasonFandomLoading,
    seasonFandomError,
    setSeasonFandomError,
    fandomSyncOpen,
    setFandomSyncOpen,
    fandomSyncPreview,
    setFandomSyncPreview,
    fandomSyncPreviewLoading,
    setFandomSyncPreviewLoading,
    fandomSyncCommitLoading,
    setFandomSyncCommitLoading,
    fandomSyncError,
    setFandomSyncError,
  };
}
