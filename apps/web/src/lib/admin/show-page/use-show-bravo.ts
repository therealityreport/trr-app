import { useRef, useState } from "react";
import type {
  BravoCandidateSummary,
  BravoImportImageKind,
  SyncBravoRunMode,
} from "@/lib/admin/show-page/types";

export function useShowBravo<TBravoVideoItem, TBravoPreviewPerson, TBravoPersonCandidateResult, TBravoNewsItem>() {
  const [bravoVideos, setBravoVideos] = useState<TBravoVideoItem[]>([]);
  const [bravoLoading, setBravoLoading] = useState(false);
  const [bravoError, setBravoError] = useState<string | null>(null);
  const [bravoVideoSyncing, setBravoVideoSyncing] = useState(false);
  const [bravoVideoSyncWarning, setBravoVideoSyncWarning] = useState<string | null>(null);
  const [bravoLoaded, setBravoLoaded] = useState(false);
  const bravoLoadInFlightRef = useRef<Promise<void> | null>(null);
  const bravoVideoSyncInFlightRef = useRef<Promise<boolean> | null>(null);
  const bravoVideoSyncAttemptedRef = useRef(false);

  const [syncBravoOpen, setSyncBravoOpen] = useState(false);
  const [syncBravoModePickerOpen, setSyncBravoModePickerOpen] = useState(false);
  const [syncBravoRunMode, setSyncBravoRunMode] = useState<SyncBravoRunMode>("full");
  const [syncBravoUrl, setSyncBravoUrl] = useState("");
  const [syncBravoDescription, setSyncBravoDescription] = useState("");
  const [syncBravoAirs, setSyncBravoAirs] = useState("");
  const [syncBravoStep, setSyncBravoStep] = useState<"preview" | "confirm">("preview");
  const [syncBravoImages, setSyncBravoImages] = useState<Array<{ url: string; alt?: string | null }>>([]);
  const [syncBravoPreviewPeople, setSyncBravoPreviewPeople] = useState<TBravoPreviewPerson[]>([]);
  const [syncFandomPreviewPeople, setSyncFandomPreviewPeople] = useState<TBravoPreviewPerson[]>([]);
  const [syncBravoPersonCandidateResults, setSyncBravoPersonCandidateResults] = useState<
    TBravoPersonCandidateResult[]
  >([]);
  const [syncFandomPersonCandidateResults, setSyncFandomPersonCandidateResults] = useState<
    TBravoPersonCandidateResult[]
  >([]);
  const [syncBravoPreviewResult, setSyncBravoPreviewResult] = useState<Record<string, unknown> | null>(null);
  const [syncBravoPreviewSignature, setSyncBravoPreviewSignature] = useState<string | null>(null);
  const [syncBravoCandidateSummary, setSyncBravoCandidateSummary] =
    useState<BravoCandidateSummary | null>(null);
  const [syncFandomCandidateSummary, setSyncFandomCandidateSummary] =
    useState<BravoCandidateSummary | null>(null);
  const [syncFandomDomainsUsed, setSyncFandomDomainsUsed] = useState<string[]>([]);
  const [syncBravoProbeTotal, setSyncBravoProbeTotal] = useState(0);
  const [syncBravoProbeStatusMessage, setSyncBravoProbeStatusMessage] = useState<string | null>(null);
  const [syncBravoProbeActive, setSyncBravoProbeActive] = useState(false);
  const [syncBravoDiscoveredPersonUrls, setSyncBravoDiscoveredPersonUrls] = useState<string[]>([]);
  const [syncBravoPreviewVideos, setSyncBravoPreviewVideos] = useState<TBravoVideoItem[]>([]);
  const [syncBravoPreviewNews, setSyncBravoPreviewNews] = useState<TBravoNewsItem[]>([]);
  const [syncBravoTargetSeasonNumber, setSyncBravoTargetSeasonNumber] = useState<number | null>(null);
  const [syncBravoPreviewSeasonFilter, setSyncBravoPreviewSeasonFilter] = useState<number | "all">("all");
  const [syncBravoSelectedImages, setSyncBravoSelectedImages] = useState<Set<string>>(new Set());
  const [syncBravoImageKinds, setSyncBravoImageKinds] = useState<Record<string, BravoImportImageKind>>({});
  const [syncBravoPreviewLoading, setSyncBravoPreviewLoading] = useState(false);
  const [syncBravoCommitLoading, setSyncBravoCommitLoading] = useState(false);
  const [syncBravoError, setSyncBravoError] = useState<string | null>(null);
  const [syncBravoNotice, setSyncBravoNotice] = useState<string | null>(null);
  const syncBravoPreviewAbortControllerRef = useRef<AbortController | null>(null);
  const syncBravoPreviewRunRef = useRef(0);

  return {
    bravoVideos,
    setBravoVideos,
    bravoLoading,
    setBravoLoading,
    bravoError,
    setBravoError,
    bravoVideoSyncing,
    setBravoVideoSyncing,
    bravoVideoSyncWarning,
    setBravoVideoSyncWarning,
    bravoLoaded,
    setBravoLoaded,
    bravoLoadInFlightRef,
    bravoVideoSyncInFlightRef,
    bravoVideoSyncAttemptedRef,
    syncBravoOpen,
    setSyncBravoOpen,
    syncBravoModePickerOpen,
    setSyncBravoModePickerOpen,
    syncBravoRunMode,
    setSyncBravoRunMode,
    syncBravoUrl,
    setSyncBravoUrl,
    syncBravoDescription,
    setSyncBravoDescription,
    syncBravoAirs,
    setSyncBravoAirs,
    syncBravoStep,
    setSyncBravoStep,
    syncBravoImages,
    setSyncBravoImages,
    syncBravoPreviewPeople,
    setSyncBravoPreviewPeople,
    syncFandomPreviewPeople,
    setSyncFandomPreviewPeople,
    syncBravoPersonCandidateResults,
    setSyncBravoPersonCandidateResults,
    syncFandomPersonCandidateResults,
    setSyncFandomPersonCandidateResults,
    syncBravoPreviewResult,
    setSyncBravoPreviewResult,
    syncBravoPreviewSignature,
    setSyncBravoPreviewSignature,
    syncBravoCandidateSummary,
    setSyncBravoCandidateSummary,
    syncFandomCandidateSummary,
    setSyncFandomCandidateSummary,
    syncFandomDomainsUsed,
    setSyncFandomDomainsUsed,
    syncBravoProbeTotal,
    setSyncBravoProbeTotal,
    syncBravoProbeStatusMessage,
    setSyncBravoProbeStatusMessage,
    syncBravoProbeActive,
    setSyncBravoProbeActive,
    syncBravoDiscoveredPersonUrls,
    setSyncBravoDiscoveredPersonUrls,
    syncBravoPreviewVideos,
    setSyncBravoPreviewVideos,
    syncBravoPreviewNews,
    setSyncBravoPreviewNews,
    syncBravoTargetSeasonNumber,
    setSyncBravoTargetSeasonNumber,
    syncBravoPreviewSeasonFilter,
    setSyncBravoPreviewSeasonFilter,
    syncBravoSelectedImages,
    setSyncBravoSelectedImages,
    syncBravoImageKinds,
    setSyncBravoImageKinds,
    syncBravoPreviewLoading,
    setSyncBravoPreviewLoading,
    syncBravoCommitLoading,
    setSyncBravoCommitLoading,
    syncBravoError,
    setSyncBravoError,
    syncBravoNotice,
    setSyncBravoNotice,
    syncBravoPreviewAbortControllerRef,
    syncBravoPreviewRunRef,
  };
}
