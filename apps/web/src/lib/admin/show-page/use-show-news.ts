import { useRef, useState } from "react";

export function useShowNews<TUnifiedNewsItem, TUnifiedNewsFacets>(initialFacets: TUnifiedNewsFacets) {
  const [unifiedNews, setUnifiedNews] = useState<TUnifiedNewsItem[]>([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsSyncing, setNewsSyncing] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [newsNotice, setNewsNotice] = useState<string | null>(null);
  const [newsLoaded, setNewsLoaded] = useState(false);
  const [newsPageCount, setNewsPageCount] = useState(0);
  const [newsTotalCount, setNewsTotalCount] = useState(0);
  const [newsFacets, setNewsFacets] = useState<TUnifiedNewsFacets>(initialFacets);
  const [newsNextCursor, setNewsNextCursor] = useState<string | null>(null);
  const [newsGoogleUrlMissing, setNewsGoogleUrlMissing] = useState(false);
  const [newsSort, setNewsSort] = useState<"trending" | "latest">("trending");
  const [newsSourceFilter, setNewsSourceFilter] = useState<string>("");
  const [newsPersonFilter, setNewsPersonFilter] = useState<string>("");
  const [newsTopicFilter, setNewsTopicFilter] = useState<string>("");
  const [newsSeasonFilter, setNewsSeasonFilter] = useState<string>("");
  const newsLoadInFlightRef = useRef<Promise<void> | null>(null);
  const newsSyncInFlightRef = useRef<Promise<boolean> | null>(null);
  const newsAutoSyncAttemptedRef = useRef(false);
  const newsLoadedQueryKeyRef = useRef<string | null>(null);
  const newsInFlightQueryKeyRef = useRef<string | null>(null);
  const newsRequestSeqRef = useRef(0);
  const pendingNewsReloadRef = useRef(false);
  const pendingNewsReloadArgsRef = useRef<{ force: boolean; forceSync: boolean; queryKey: string } | null>(null);
  const newsCursorQueryKeyRef = useRef<string | null>(null);

  return {
    unifiedNews,
    setUnifiedNews,
    newsLoading,
    setNewsLoading,
    newsSyncing,
    setNewsSyncing,
    newsError,
    setNewsError,
    newsNotice,
    setNewsNotice,
    newsLoaded,
    setNewsLoaded,
    newsPageCount,
    setNewsPageCount,
    newsTotalCount,
    setNewsTotalCount,
    newsFacets,
    setNewsFacets,
    newsNextCursor,
    setNewsNextCursor,
    newsGoogleUrlMissing,
    setNewsGoogleUrlMissing,
    newsSort,
    setNewsSort,
    newsSourceFilter,
    setNewsSourceFilter,
    newsPersonFilter,
    setNewsPersonFilter,
    newsTopicFilter,
    setNewsTopicFilter,
    newsSeasonFilter,
    setNewsSeasonFilter,
    newsLoadInFlightRef,
    newsSyncInFlightRef,
    newsAutoSyncAttemptedRef,
    newsLoadedQueryKeyRef,
    newsInFlightQueryKeyRef,
    newsRequestSeqRef,
    pendingNewsReloadRef,
    pendingNewsReloadArgsRef,
    newsCursorQueryKeyRef,
  };
}
