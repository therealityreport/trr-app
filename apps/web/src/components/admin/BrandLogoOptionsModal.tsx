"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";
import AdminModal from "@/components/admin/AdminModal";
import { Button } from "@/components/ui/button";
import {
  Editable,
  EditableArea,
  EditableCancel,
  EditableInput,
  EditablePreview,
  EditableSubmit,
  EditableToolbar,
  EditableTrigger,
} from "@/components/ui/editable";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";

type BrandLogoRole = "wordmark" | "icon";
type SourceQueryKind = "search_term" | "slug" | "host_or_url" | "readonly";
type SourceStatus = "idle" | "loading" | "saving" | "ready" | "error";

type LogoOptionRow = {
  id: string;
  source_url: string | null;
  source_provider?: string | null;
  discovered_from?: string | null;
  hosted_logo_url?: string | null;
  hosted_logo_black_url?: string | null;
  hosted_logo_white_url?: string | null;
  is_selected_for_role?: boolean;
  option_kind?: string | null;
};

type DiscoverCandidate = {
  id: string;
  source_url: string;
  source_provider?: string | null;
  discovered_from?: string | null;
  hosted_logo_url?: string | null;
  hosted_logo_black_url?: string | null;
  hosted_logo_white_url?: string | null;
  is_selected_for_role?: boolean;
  logo_role: BrandLogoRole;
  option_kind: "candidate";
};

type SourceSummary = {
  source_provider: string;
  total_count: number;
  has_more: boolean;
  editable?: boolean;
  refreshable?: boolean;
  query_kind?: SourceQueryKind;
  default_query_value?: string | null;
  effective_query_value?: string | null;
  query_values?: string[];
  query_links?: string[];
  logo_role?: BrandLogoRole;
};

type SourceQuerySaveResponse = {
  source?: SourceSummary;
};

type InitialLoadResult = {
  options: LogoOptionRow[];
  sourceRowsRaw: SourceSummary[];
  errors: string[];
};

type DiscoverResponse = {
  candidates: DiscoverCandidate[];
  hasMore: boolean;
  nextOffset: number;
  totalCount: number;
};

type ModalTargetType = "network" | "streaming" | "production" | "franchise" | "publication" | "social" | "other";

type BrandLogoOptionsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  preferredUser: User | null;
  targetType: ModalTargetType;
  targetKey: string;
  targetLabel: string;
  logoRole: BrandLogoRole;
  onSaved: () => Promise<void> | void;
};

const PLACEHOLDER_ICON_PATH = "/icons/brand-placeholder.svg";
const MANUAL_SOURCE_PROVIDER = "manual_import_url";
const SAVED_SOURCE_PROVIDER = "saved";
const SOURCE_PREFETCH_SIZE = 10;
const SOURCE_PREFETCH_CONCURRENCY = 3;

const QUERY_PLACEHOLDERS: Record<SourceQueryKind, string> = {
  search_term: "Enter search term",
  slug: "Enter source path slug",
  host_or_url: "Enter source host or URL",
  readonly: "",
};

const SHARED_SLUG_SOURCE_KINDS: SourceQueryKind[] = ["slug", "search_term"];

const pickDisplayUrl = (row: LogoOptionRow | DiscoverCandidate): string | null =>
  row.hosted_logo_url || row.hosted_logo_black_url || row.hosted_logo_white_url || row.source_url || null;

const isSchemaVariantError = (message: string): boolean => {
  const normalized = (message || "").toLowerCase();
  return (
    normalized.includes("hosted_logo_black_url")
    || normalized.includes("hosted_logo_white_url")
    || (normalized.includes("does not exist") && normalized.includes("hosted_logo"))
  );
};

const normalizeLogoOptionsErrorMessage = (message: string): string => {
  if (isSchemaVariantError(message)) {
    return "Related logo pairing temporarily unavailable; discovery sources are still usable.";
  }
  return message;
};

const isHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const isHttpImageUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    return /\.(svg|png|webp|jpg|jpeg|gif|avif)(?:$|[?#])/i.test(parsed.pathname + parsed.search + parsed.hash);
  } catch {
    return false;
  }
};

const manualCandidateId = (url: string, role: BrandLogoRole): string =>
  `candidate:manual:${encodeURIComponent(`${role}:${url}`)}`;

const parseErrorPayload = async (response: Response): Promise<string> => {
  const fallback = `Request failed (${response.status})`;
  try {
    const payload = (await response.json()) as { detail?: string; error?: string; message?: string };
    if (typeof payload.error === "string") return payload.error;
    if (typeof payload.detail === "string") return payload.detail;
    if (typeof payload.message === "string") return payload.message;
  } catch {
    return fallback;
  }
  return fallback;
};

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  const limit = Math.max(1, Math.min(concurrency, items.length));
  let cursor = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (cursor < items.length) {
        const current = items[cursor];
        cursor += 1;
        if (current === undefined) break;
        await worker(current);
      }
    }),
  );
}

function joinClassNames(...values: Array<string | undefined | false | null>): string {
  return values.filter(Boolean).join(" ");
}

function getSourceQueryValues(source: SourceSummary | null | undefined): string[] {
  const rawValues = Array.isArray(source?.query_values) ? source.query_values : [];
  const deduped = rawValues.filter((value, index) => {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return false;
    return rawValues.findIndex((candidate) => candidate.trim().toLowerCase() === normalized) === index;
  });
  if (deduped.length > 0) return deduped;
  const fallback = (source?.effective_query_value || "").trim();
  return fallback ? [fallback] : [];
}

function dedupeNormalizedValues(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const normalizedKey = trimmed.toLowerCase();
    if (seen.has(normalizedKey)) continue;
    seen.add(normalizedKey);
    out.push(trimmed);
  }
  return out;
}

function normalizeSharedSlug(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  let candidate = trimmed;
  try {
    const parsed = new URL(trimmed);
    const nextQuery =
      parsed.searchParams.get("query")
      || parsed.searchParams.get("q")
      || parsed.searchParams.get("search")
      || parsed.searchParams.get("s");
    if (nextQuery) {
      candidate = decodeURIComponent(nextQuery);
    } else {
      let path = decodeURIComponent(parsed.pathname).replace(/^\/+|\/+$/g, "");
      if (path.toLowerCase().startsWith("wiki/")) {
        path = path.slice(5);
      }
      candidate = path || parsed.hostname;
    }
  } catch {
    candidate = trimmed;
  }

  return candidate
    .replace(/^special:search/i, "")
    .replace(/[_/]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function humanizeSharedSlug(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/[_/]+/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function deriveSharedSlugsFromSources(sourceRows: SourceSummary[]): string[] {
  const preferredSources = sourceRows.filter((source) => source.editable && source.query_kind === "slug");
  const fallbackSources = sourceRows.filter((source) => source.editable && source.query_kind === "search_term");
  const seedSources = preferredSources.length > 0 ? preferredSources : fallbackSources;
  return dedupeNormalizedValues(
    seedSources.flatMap((source) => getSourceQueryValues(source).map((value) => normalizeSharedSlug(value)).filter(Boolean)),
  );
}

function buildQueriesFromSharedSlugs(source: SourceSummary, slugs: string[]): string[] {
  const normalizedSlugs = dedupeNormalizedValues(slugs.map((value) => normalizeSharedSlug(value)).filter(Boolean));
  if (source.query_kind === "slug") {
    return normalizedSlugs;
  }
  if (source.query_kind === "search_term") {
    return normalizedSlugs.map((slug) => humanizeSharedSlug(slug)).filter(Boolean);
  }
  return getSourceQueryValues(source);
}

function areStringListsEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

function renderSourceLinks(queryLinks: string[] | undefined) {
  if (!queryLinks || queryLinks.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
      {queryLinks.map((queryLink) =>
        isHttpUrl(queryLink) ? (
          <a
            key={queryLink}
            href={queryLink}
            target="_blank"
            rel="noreferrer noopener"
            className="underline decoration-zinc-300 underline-offset-2 hover:text-zinc-700"
          >
            {queryLink}
          </a>
        ) : (
          <span key={queryLink}>{queryLink}</span>
        ),
      )}
    </div>
  );
}

export default function BrandLogoOptionsModal({
  isOpen,
  onClose,
  preferredUser,
  targetType,
  targetKey,
  targetLabel,
  logoRole,
  onSaved,
}: BrandLogoOptionsModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<SourceSummary[]>([]);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [storedOptions, setStoredOptions] = useState<LogoOptionRow[]>([]);
  const [discoveredOptionsBySource, setDiscoveredOptionsBySource] = useState<Record<string, DiscoverCandidate[]>>({});
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [discoverOffsetBySource, setDiscoverOffsetBySource] = useState<Record<string, number>>({});
  const [discoverHasMoreBySource, setDiscoverHasMoreBySource] = useState<Record<string, boolean>>({});
  const [discoveredCountBySource, setDiscoveredCountBySource] = useState<Record<string, number>>({});
  const [discoverIncludeRelated, setDiscoverIncludeRelated] = useState(false);
  const [manualImageUrl, setManualImageUrl] = useState("");
  const [manualImportOpen, setManualImportOpen] = useState(false);
  const [slugPanelOpen, setSlugPanelOpen] = useState(false);
  const [applyingSlugs, setApplyingSlugs] = useState(false);
  const [sharedSlugs, setSharedSlugs] = useState<string[]>([]);
  const [addingSharedSlug, setAddingSharedSlug] = useState(false);
  const [newSharedSlugDraft, setNewSharedSlugDraft] = useState("");
  const [manualImportError, setManualImportError] = useState<string | null>(null);
  const [brokenPreviewIds, setBrokenPreviewIds] = useState<Record<string, boolean>>({});
  const [sourceStatusBySource, setSourceStatusBySource] = useState<Record<string, SourceStatus>>({});
  const [sourceErrorBySource, setSourceErrorBySource] = useState<Record<string, string | null>>({});
  const [addingQueryBySource, setAddingQueryBySource] = useState<Record<string, boolean>>({});
  const [newQueryDraftBySource, setNewQueryDraftBySource] = useState<Record<string, string>>({});
  const sourcesRef = useRef<SourceSummary[]>([]);
  const discoverOffsetBySourceRef = useRef<Record<string, number>>({});
  const discoverIncludeRelatedRef = useRef(false);
  const currentFeaturedOptionIdRef = useRef<string | null>(null);

  const includeRelated = targetType === "publication" || targetType === "social";

  const fetchWithAuth = useCallback(
    (input: RequestInfo | URL, init?: RequestInit) =>
      fetchAdminWithAuth(input, init, {
        preferredUser,
        allowDevAdminBypass: true,
      }),
    [preferredUser],
  );

  useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);

  useEffect(() => {
    discoverOffsetBySourceRef.current = discoverOffsetBySource;
  }, [discoverOffsetBySource]);

  useEffect(() => {
    discoverIncludeRelatedRef.current = discoverIncludeRelated;
  }, [discoverIncludeRelated]);

  useEffect(() => {
    if (applyingSlugs) return;
    const derived = deriveSharedSlugsFromSources(sources);
    setSharedSlugs((previous) => (areStringListsEqual(previous, derived) ? previous : derived));
  }, [applyingSlugs, sources]);

  const updateSourceSummary = useCallback((sourceProvider: string, updater: (source: SourceSummary) => SourceSummary) => {
    setSources((previous) =>
      previous.map((source) => (source.source_provider === sourceProvider ? updater(source) : source)),
    );
  }, []);

  const loadForIncludeRelated = useCallback(
    async (related: boolean): Promise<InitialLoadResult> => {
      const logosParams = new URLSearchParams({
        target_type: targetType,
        target_key: targetKey,
        logo_role: logoRole,
        include_related: related ? "true" : "false",
        limit: "500",
      });
      const sourceParams = new URLSearchParams({
        target_type: targetType,
        target_key: targetKey,
        target_label: targetLabel,
        logo_role: logoRole,
        include_related: related ? "true" : "false",
      });

      const [logosResponse, sourcesResponse] = await Promise.all([
        fetchWithAuth(`/api/admin/trr-api/brands/logos?${logosParams.toString()}`, { cache: "no-store" }),
        fetchWithAuth(`/api/admin/trr-api/brands/logos/options/sources?${sourceParams.toString()}`, { cache: "no-store" }),
      ]);

      const errors: string[] = [];
      let options: LogoOptionRow[] = [];
      let sourceRowsRaw: SourceSummary[] = [];

      if (logosResponse.ok) {
        const logosPayload = (await logosResponse.json()) as { rows?: LogoOptionRow[] };
        options = Array.isArray(logosPayload.rows) ? logosPayload.rows : [];
      } else {
        errors.push(await parseErrorPayload(logosResponse));
      }

      if (sourcesResponse.ok) {
        const sourcePayload = (await sourcesResponse.json()) as { sources?: SourceSummary[] };
        sourceRowsRaw = Array.isArray(sourcePayload.sources) ? sourcePayload.sources : [];
      } else {
        errors.push(await parseErrorPayload(sourcesResponse));
      }

      return { options, sourceRowsRaw, errors };
    },
    [fetchWithAuth, logoRole, targetKey, targetLabel, targetType],
  );

  const discoverBySource = useCallback(
    async (
      sourceProvider: string,
      offset: number,
      limit: number,
      related: boolean,
      queryOverrides: string[] | null | undefined,
    ): Promise<DiscoverResponse> => {
      const response = await fetchWithAuth("/api/admin/trr-api/brands/logos/options/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: targetType,
          target_key: targetKey,
          target_label: targetLabel,
          logo_role: logoRole,
          source_provider: sourceProvider,
          query_override: queryOverrides?.[0] || undefined,
          query_overrides: queryOverrides && queryOverrides.length > 0 ? queryOverrides : undefined,
          offset,
          limit,
          include_related: related,
        }),
      });
      if (!response.ok) {
        throw new Error(normalizeLogoOptionsErrorMessage(await parseErrorPayload(response)));
      }
      const payload = (await response.json()) as {
        candidates?: DiscoverCandidate[];
        has_more?: boolean;
        next_offset?: number;
        total_count?: number;
      };
      return {
        candidates: (Array.isArray(payload.candidates) ? payload.candidates : []).map((candidate) => ({
          ...candidate,
          option_kind: "candidate" as const,
        })),
        hasMore: Boolean(payload.has_more),
        nextOffset: Number(payload.next_offset ?? offset),
        totalCount: Number(payload.total_count ?? 0),
      };
    },
    [fetchWithAuth, logoRole, targetKey, targetLabel, targetType],
  );

  const replaceDiscoveredOptionsForSource = useCallback((sourceProvider: string, candidates: DiscoverCandidate[]) => {
    setDiscoveredOptionsBySource((previous) => {
      const previousCandidates = previous[sourceProvider] ?? [];
      if (previousCandidates.length > 0) {
        setSelectedOptionId((previousSelectedId) => {
          if (!previousSelectedId) return previousSelectedId;
          const replacedPreviousSelection = previousCandidates.some((row) => row.id === previousSelectedId);
          if (!replacedPreviousSelection) return previousSelectedId;
          return candidates.some((row) => row.id === previousSelectedId)
            ? previousSelectedId
            : currentFeaturedOptionIdRef.current;
        });
      }
      return { ...previous, [sourceProvider]: candidates };
    });
  }, []);

  const appendDiscoveredOptionsForSource = useCallback((sourceProvider: string, candidates: DiscoverCandidate[]) => {
    setDiscoveredOptionsBySource((previous) => {
      const existing = previous[sourceProvider] ?? [];
      const existingIds = new Set(existing.map((row) => row.id));
      const existingKeys = new Set(existing.map((row) => `${row.source_provider || "unknown"}|${row.source_url}`));
      const merged = [...existing];
      for (const candidate of candidates) {
        const key = `${candidate.source_provider || "unknown"}|${candidate.source_url}`;
        if (existingIds.has(candidate.id) || existingKeys.has(key)) continue;
        existingIds.add(candidate.id);
        existingKeys.add(key);
        merged.push(candidate);
      }
      return { ...previous, [sourceProvider]: merged };
    });
  }, []);

  const refreshSource = useCallback(
    async ({
      append = false,
      related = discoverIncludeRelatedRef.current,
      sourceProvider,
      sourceSnapshot,
    }: {
      append?: boolean;
      related?: boolean;
      sourceProvider: string;
      sourceSnapshot?: SourceSummary;
    }) => {
      const source = sourceSnapshot ?? sourcesRef.current.find((row) => row.source_provider === sourceProvider);
      if (!source?.refreshable) return;

      const offset = append ? discoverOffsetBySourceRef.current[sourceProvider] ?? 0 : 0;
      setSourceStatusBySource((previous) => ({
        ...previous,
        [sourceProvider]: append ? "loading" : "loading",
      }));
      setSourceErrorBySource((previous) => ({
        ...previous,
        [sourceProvider]: null,
      }));

      try {
        const response = await discoverBySource(
          sourceProvider,
          offset,
          SOURCE_PREFETCH_SIZE,
          related,
          getSourceQueryValues(source),
        );
        if (append) {
          appendDiscoveredOptionsForSource(sourceProvider, response.candidates);
        } else {
          replaceDiscoveredOptionsForSource(sourceProvider, response.candidates);
        }
        setDiscoveredCountBySource((previous) => ({
          ...previous,
          [sourceProvider]: response.totalCount,
        }));
        setDiscoverOffsetBySource((previous) => ({
          ...previous,
          [sourceProvider]: response.nextOffset,
        }));
        setDiscoverHasMoreBySource((previous) => ({
          ...previous,
          [sourceProvider]: response.hasMore,
        }));
        setSourceStatusBySource((previous) => ({
          ...previous,
          [sourceProvider]: "ready",
        }));
      } catch (sourceError) {
        setSourceStatusBySource((previous) => ({
          ...previous,
          [sourceProvider]: "error",
        }));
        setSourceErrorBySource((previous) => ({
          ...previous,
          [sourceProvider]: normalizeLogoOptionsErrorMessage(
            sourceError instanceof Error ? sourceError.message : "Failed to refresh source",
          ),
        }));
      }
    },
    [
      appendDiscoveredOptionsForSource,
      discoverBySource,
      replaceDiscoveredOptionsForSource,
    ],
  );

  const prefetchSourceCandidates = useCallback(
    async (sourceRows: SourceSummary[], related: boolean) => {
      const refreshableRows = sourceRows.filter((source) => source.refreshable);
      if (refreshableRows.length === 0) return;

      setSourceStatusBySource((previous) => {
        const next = { ...previous };
        for (const source of refreshableRows) {
          next[source.source_provider] = "loading";
        }
        return next;
      });

      await runWithConcurrency(refreshableRows, SOURCE_PREFETCH_CONCURRENCY, async (source) => {
        await refreshSource({
          sourceProvider: source.source_provider,
          sourceSnapshot: source,
          related,
        });
      });
    },
    [refreshSource],
  );

  const saveSourceQueries = useCallback(
    async (sourceProvider: string, nextValues: string[]) => {
      setSourceStatusBySource((previous) => ({
        ...previous,
        [sourceProvider]: "saving",
      }));
      setSourceErrorBySource((previous) => ({
        ...previous,
        [sourceProvider]: null,
      }));

      const response = await fetchWithAuth("/api/admin/trr-api/brands/logos/options/source-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: targetType,
          target_key: targetKey,
          target_label: targetLabel,
          logo_role: logoRole,
          source_provider: sourceProvider,
          query_values: nextValues,
        }),
      });

      if (!response.ok) {
        const message = normalizeLogoOptionsErrorMessage(await parseErrorPayload(response));
        setSourceStatusBySource((previous) => ({
          ...previous,
          [sourceProvider]: "error",
        }));
        setSourceErrorBySource((previous) => ({
          ...previous,
          [sourceProvider]: message,
        }));
        throw new Error(message);
      }

      const payload = (await response.json()) as SourceQuerySaveResponse;
      if (payload.source) {
        updateSourceSummary(sourceProvider, (source) => ({
          ...source,
          ...payload.source,
          total_count: source.total_count,
        }));
        await refreshSource({
          sourceProvider,
          sourceSnapshot: {
            ...payload.source,
            source_provider: payload.source.source_provider || sourceProvider,
            total_count: sourcesRef.current.find((source) => source.source_provider === sourceProvider)?.total_count ?? 0,
            has_more: payload.source.has_more ?? false,
          },
        });
      } else {
        await refreshSource({ sourceProvider });
      }
      setAddingQueryBySource((previous) => ({
        ...previous,
        [sourceProvider]: false,
      }));
      setNewQueryDraftBySource((previous) => ({
        ...previous,
        [sourceProvider]: "",
      }));
    },
    [fetchWithAuth, logoRole, refreshSource, targetKey, targetLabel, targetType, updateSourceSummary],
  );

  const applySharedSlugs = useCallback(
    async (nextSlugs: string[]) => {
      const normalizedSlugs = dedupeNormalizedValues(nextSlugs.map((value) => normalizeSharedSlug(value)).filter(Boolean));
      setApplyingSlugs(true);
      setError(null);
      try {
        const eligibleSources = sourcesRef.current.filter(
          (source) => source.editable && SHARED_SLUG_SOURCE_KINDS.includes(source.query_kind ?? "readonly"),
        );
        for (const source of eligibleSources) {
          const nextQueryValues = buildQueriesFromSharedSlugs(source, normalizedSlugs);
          const currentQueryValues = getSourceQueryValues(source);
          if (areStringListsEqual(currentQueryValues, nextQueryValues)) continue;
          await saveSourceQueries(source.source_provider, nextQueryValues);
        }
        setSharedSlugs(normalizedSlugs);
        setAddingSharedSlug(false);
        setNewSharedSlugDraft("");
      } catch (applyError) {
        setError(
          normalizeLogoOptionsErrorMessage(
            applyError instanceof Error ? applyError.message : "Failed to apply shared slugs",
          ),
        );
      } finally {
        setApplyingSlugs(false);
      }
    },
    [saveSourceQueries],
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    setManualImportError(null);
    setManualImageUrl("");
    setSlugPanelOpen(false);
    setApplyingSlugs(false);
    setSharedSlugs([]);
    setAddingSharedSlug(false);
    setNewSharedSlugDraft("");
    setBrokenPreviewIds({});
    setDiscoveredOptionsBySource({});
    setSelectedOptionId(null);
    setDiscoveredCountBySource({});
    setDiscoverOffsetBySource({});
    setDiscoverHasMoreBySource({});
    setSourceErrorBySource({});
    setSourceStatusBySource({});
    setAddingQueryBySource({});
    setNewQueryDraftBySource({});

    try {
      const initial = await loadForIncludeRelated(includeRelated);
      let options = initial.options;
      let sourceRowsRaw = initial.sourceRowsRaw;
      let loadErrors = initial.errors;
      let showRelatedFallbackWarning = false;
      let relatedForDiscovery = includeRelated;

      if (includeRelated && loadErrors.some((message) => isSchemaVariantError(message))) {
        const fallback = await loadForIncludeRelated(false);
        options = fallback.options;
        sourceRowsRaw = fallback.sourceRowsRaw;
        loadErrors = fallback.errors;
        showRelatedFallbackWarning = true;
        relatedForDiscovery = false;
      }

      setStoredOptions(options);
      setSources(sourceRowsRaw);
      setSharedSlugs(deriveSharedSlugsFromSources(sourceRowsRaw));
      setDiscoverIncludeRelated(relatedForDiscovery);
      const selectedStored = options.find((row) => row.is_selected_for_role);
      setSelectedOptionId(selectedStored?.id ?? null);
      setActiveSource(
        (options.length > 0 ? SAVED_SOURCE_PROVIDER : null)
          || selectedStored?.source_provider
          || sourceRowsRaw.find((source) => source.source_provider !== "related_network_streaming")?.source_provider
          || sourceRowsRaw[0]?.source_provider
          || null,
      );
      setDiscoverHasMoreBySource(
        Object.fromEntries(sourceRowsRaw.map((source) => [source.source_provider, Boolean(source.has_more)])),
      );
      setSourceStatusBySource(
        Object.fromEntries(
          sourceRowsRaw.map((source) => [source.source_provider, source.refreshable ? ("idle" as const) : ("ready" as const)]),
        ),
      );

      if (showRelatedFallbackWarning) {
        setError("Related logo pairing temporarily unavailable; discovery sources are still usable.");
      } else if (loadErrors.length > 0) {
        setError(normalizeLogoOptionsErrorMessage(loadErrors[0] || "Failed to load logo options"));
      }

      void prefetchSourceCandidates(sourceRowsRaw, relatedForDiscovery);
    } catch (loadError) {
      setStoredOptions([]);
      setSources([]);
      setActiveSource(null);
      setError(normalizeLogoOptionsErrorMessage(loadError instanceof Error ? loadError.message : "Failed to load logo options"));
    } finally {
      setLoading(false);
    }
  }, [includeRelated, loadForIncludeRelated, prefetchSourceCandidates]);

  useEffect(() => {
    if (!isOpen) return;
    void loadInitial();
  }, [isOpen, loadInitial]);

  const manualOptions = useMemo(
    () => discoveredOptionsBySource[MANUAL_SOURCE_PROVIDER] ?? [],
    [discoveredOptionsBySource],
  );

  const savedSourceSummary = useMemo<SourceSummary | null>(() => {
    if (storedOptions.length === 0) return null;
    return {
      source_provider: SAVED_SOURCE_PROVIDER,
      total_count: storedOptions.length,
      has_more: false,
      editable: false,
      refreshable: false,
      query_kind: "readonly",
      default_query_value: "saved library assets",
      effective_query_value: "saved library assets",
      query_links: ["featured assets already stored in TRR"],
      logo_role: logoRole,
    };
  }, [logoRole, storedOptions.length]);

  const manualSourceSummary = useMemo<SourceSummary | null>(() => {
    if (manualOptions.length === 0) return null;
    return {
      source_provider: MANUAL_SOURCE_PROVIDER,
      total_count: manualOptions.length,
      has_more: false,
      editable: false,
      refreshable: false,
      query_kind: "readonly",
      default_query_value: "manual import",
      effective_query_value: "manual import",
      query_links: ["manual URL input"],
      logo_role: logoRole,
    };
  }, [logoRole, manualOptions.length]);

  const sourceLookup = useMemo(() => {
    const map = new Map(sources.map((source) => [source.source_provider, source]));
    if (savedSourceSummary) {
      map.set(savedSourceSummary.source_provider, savedSourceSummary);
    }
    if (manualSourceSummary) {
      map.set(manualSourceSummary.source_provider, manualSourceSummary);
    }
    return map;
  }, [manualSourceSummary, savedSourceSummary, sources]);

  const optionsById = useMemo(() => {
    const map = new Map<string, LogoOptionRow | DiscoverCandidate>();
    for (const option of storedOptions) {
      map.set(option.id, option);
    }
    for (const sourceOptions of Object.values(discoveredOptionsBySource)) {
      for (const option of sourceOptions) {
        map.set(option.id, option);
      }
    }
    return map;
  }, [discoveredOptionsBySource, storedOptions]);

  const currentFeaturedOptionId = useMemo(
    () => storedOptions.find((row) => row.is_selected_for_role)?.id ?? null,
    [storedOptions],
  );

  useEffect(() => {
    currentFeaturedOptionIdRef.current = currentFeaturedOptionId;
  }, [currentFeaturedOptionId]);

  const selectedOption = useMemo(
    () => (selectedOptionId ? optionsById.get(selectedOptionId) ?? null : null),
    [optionsById, selectedOptionId],
  );
  const sourceTabs = useMemo(() => {
    const tabs = [...sources]
      .filter((source) => {
        const hasLiveCount = Object.prototype.hasOwnProperty.call(discoveredCountBySource, source.source_provider);
        const displayCount = hasLiveCount ? discoveredCountBySource[source.source_provider] : source.total_count;
        if (source.source_provider === "related_network_streaming" && displayCount <= 0) {
          return false;
        }
        return true;
      })
      .sort((left, right) => {
        const leftHasLiveCount = Object.prototype.hasOwnProperty.call(discoveredCountBySource, left.source_provider);
        const rightHasLiveCount = Object.prototype.hasOwnProperty.call(discoveredCountBySource, right.source_provider);
        const leftCount = leftHasLiveCount ? discoveredCountBySource[left.source_provider] : left.total_count;
        const rightCount = rightHasLiveCount ? discoveredCountBySource[right.source_provider] : right.total_count;
        if (rightCount !== leftCount) return rightCount - leftCount;
        const leftLoading = sourceStatusBySource[left.source_provider] === "loading";
        const rightLoading = sourceStatusBySource[right.source_provider] === "loading";
        if (leftLoading !== rightLoading) return leftLoading ? 1 : -1;
        return left.source_provider.localeCompare(right.source_provider);
      });
    const out: SourceSummary[] = [];
    if (savedSourceSummary) {
      out.push(savedSourceSummary);
    }
    out.push(...tabs);
    if (manualSourceSummary) {
      out.push(manualSourceSummary);
    }
    return out;
  }, [discoveredCountBySource, manualSourceSummary, savedSourceSummary, sourceStatusBySource, sources]);

  useEffect(() => {
    if (sourceTabs.length === 0) {
      if (activeSource !== null) setActiveSource(null);
      return;
    }
    if (!activeSource || !sourceTabs.some((source) => source.source_provider === activeSource)) {
      setActiveSource(sourceTabs[0]?.source_provider ?? null);
    }
  }, [activeSource, sourceTabs]);

  const allOptions = useMemo(() => {
    if (!activeSource) return [];
    if (activeSource === SAVED_SOURCE_PROVIDER) {
      return storedOptions;
    }
    if (activeSource === MANUAL_SOURCE_PROVIDER) {
      return manualOptions;
    }
    const storedForSource = storedOptions.filter((row) => (row.source_provider || "unknown") === activeSource);
    const discoveredForSource = discoveredOptionsBySource[activeSource] ?? [];
    return [...storedForSource, ...discoveredForSource];
  }, [activeSource, discoveredOptionsBySource, manualOptions, storedOptions]);

  const activeSourceRow = activeSource ? sourceLookup.get(activeSource) ?? null : null;
  const activeSourceStatus = activeSource ? sourceStatusBySource[activeSource] : undefined;
  const activeSourceError = activeSource ? sourceErrorBySource[activeSource] : undefined;
  const activeSourceQueryValues = getSourceQueryValues(activeSourceRow);
  const featuredOption = selectedOption || storedOptions.find((row) => row.is_selected_for_role) || allOptions[0] || null;
  const hasPendingSelection = Boolean(selectedOption?.id && selectedOption.id !== currentFeaturedOptionId);
  const canSaveSelection = Boolean(selectedOption) && (currentFeaturedOptionId === null || selectedOption?.id !== currentFeaturedOptionId);

  const onAddManualImageUrl = useCallback(() => {
    const sourceUrl = manualImageUrl.trim();
    if (!sourceUrl) {
      setManualImportError("Enter an image URL to import.");
      return;
    }
    if (!isHttpImageUrl(sourceUrl)) {
      setManualImportError("Enter a valid http(s) image URL.");
      return;
    }
    const candidate: DiscoverCandidate = {
      id: manualCandidateId(sourceUrl, logoRole),
      source_url: sourceUrl,
      source_provider: MANUAL_SOURCE_PROVIDER,
      discovered_from: sourceUrl,
      logo_role: logoRole,
      option_kind: "candidate",
    };
    setManualImportError(null);
    setDiscoveredOptionsBySource((previous) => {
      const manualRows = previous[MANUAL_SOURCE_PROVIDER] ?? [];
      if (manualRows.some((row) => row.source_url === candidate.source_url && row.logo_role === candidate.logo_role)) {
        return previous;
      }
      return {
        ...previous,
        [MANUAL_SOURCE_PROVIDER]: [...manualRows, candidate],
      };
    });
    setDiscoveredCountBySource((previous) => ({
      ...previous,
      [MANUAL_SOURCE_PROVIDER]: Math.max(1, (previous[MANUAL_SOURCE_PROVIDER] ?? 0) + 1),
    }));
    setDiscoverHasMoreBySource((previous) => ({
      ...previous,
      [MANUAL_SOURCE_PROVIDER]: false,
    }));
    setActiveSource(MANUAL_SOURCE_PROVIDER);
    setSelectedOptionId(candidate.id);
    setManualImageUrl("");
  }, [logoRole, manualImageUrl]);

  const onLoadMore = useCallback(async () => {
    if (!activeSourceRow?.refreshable || !activeSource) return;
    await refreshSource({ append: true, sourceProvider: activeSource, sourceSnapshot: activeSourceRow });
  }, [activeSource, activeSourceRow, refreshSource]);

  const onSave = useCallback(async () => {
    if (!selectedOption) {
      setError("Select a logo option before saving.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        target_type: targetType,
        target_key: targetKey,
        target_label: targetLabel,
        logo_role: logoRole,
      };
      if ((selectedOption.option_kind || "stored") === "candidate") {
        payload.candidate = {
          source_url: selectedOption.source_url,
          source_provider: selectedOption.source_provider || null,
          discovered_from: selectedOption.discovered_from || null,
        };
      } else {
        payload.asset_id = selectedOption.id;
      }
      const response = await fetchWithAuth("/api/admin/trr-api/brands/logos/options/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(normalizeLogoOptionsErrorMessage(await parseErrorPayload(response)));
      }
      await onSaved();
      onClose();
    } catch (saveError) {
      setError(
        normalizeLogoOptionsErrorMessage(
          saveError instanceof Error ? saveError.message : "Failed to save selected logo option",
        ),
      );
    } finally {
      setSaving(false);
    }
  }, [fetchWithAuth, logoRole, onClose, onSaved, selectedOption, targetKey, targetLabel, targetType]);

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${logoRole === "wordmark" ? "Wordmark" : "Icon"} Options • ${targetLabel}`}
      panelClassName="max-h-[90vh] max-w-6xl overflow-hidden p-0"
    >
      <div className="flex h-full min-h-0 max-h-[90vh] flex-col">
        <div className="border-b border-zinc-200 bg-white px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Source Discovery</p>
              <p className="text-sm text-zinc-600">
                Auto-scraped source counts, per-source query editing, and one-click refresh for logo candidates.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={slugPanelOpen ? "secondary" : "outline"}
                size="sm"
                onClick={() => setSlugPanelOpen((previous) => !previous)}
              >
                {slugPanelOpen ? "Hide Slugs" : "Slugs"}
              </Button>
              <Button
                variant={manualImportOpen ? "secondary" : "outline"}
                size="sm"
                onClick={() => setManualImportOpen((previous) => !previous)}
              >
                {manualImportOpen ? "Hide Manual Import" : "Add Manual Import"}
              </Button>
            </div>
          </div>

          {featuredOption ? (
            <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative h-16 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white sm:w-40">
                  <Image
                    src={pickDisplayUrl(featuredOption) || PLACEHOLDER_ICON_PATH}
                    alt={`${targetLabel} featured ${logoRole}`}
                    fill
                    className="object-contain p-2"
                    unoptimized
                  />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                    {hasPendingSelection ? "Pending Featured" : "Current Featured"}
                  </p>
                  <p className="text-sm font-semibold text-zinc-900">
                    {featuredOption.source_provider || "saved"}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {featuredOption.discovered_from || featuredOption.source_url || "Saved in TRR"}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {slugPanelOpen ? (
            <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Shared Slugs</p>
                    <p className="text-sm text-zinc-600">
                      Apply slug variants across compatible logo sources.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddingSharedSlug(true)}
                    disabled={applyingSlugs}
                  >
                    Add Slug
                  </Button>
                </div>

                {sharedSlugs.length > 0 ? (
                  <div className="space-y-3">
                    {sharedSlugs.map((slugValue, index) => (
                      <Editable
                        key={`shared-slug:${slugValue}:${index}`}
                        value={slugValue}
                        placeholder="Enter shared slug"
                        onSubmit={(nextValue) => {
                          const nextSlugs = [...sharedSlugs];
                          const normalized = normalizeSharedSlug(nextValue);
                          if (normalized) {
                            nextSlugs[index] = normalized;
                          } else {
                            nextSlugs.splice(index, 1);
                          }
                          return applySharedSlugs(nextSlugs);
                        }}
                      >
                        <EditableArea>
                          <EditablePreview />
                          <EditableInput />
                        </EditableArea>
                        <EditableToolbar className="pt-1">
                          <EditableSubmit asChild>
                            <Button size="sm">Save</Button>
                          </EditableSubmit>
                          <EditableCancel asChild>
                            <Button variant="outline" size="sm">
                              Cancel
                            </Button>
                          </EditableCancel>
                        </EditableToolbar>
                        <div className="pt-1">
                          <EditableTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-fit">
                              Edit slug
                            </Button>
                          </EditableTrigger>
                        </div>
                      </Editable>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">No shared slugs yet.</p>
                )}

                {addingSharedSlug ? (
                  <div className="space-y-2 rounded-xl border border-dashed border-zinc-300 bg-white p-3">
                    <label className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500" htmlFor="new-shared-slug">
                      New Slug
                    </label>
                    <input
                      id="new-shared-slug"
                      aria-label="New Slug"
                      type="text"
                        name="new_shared_slug"
                        value={newSharedSlugDraft}
                      onChange={(event) => setNewSharedSlugDraft(event.target.value)}
                      placeholder="Enter shared slug"
                      className="min-h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        disabled={applyingSlugs}
                        onClick={() => void applySharedSlugs([...sharedSlugs, newSharedSlugDraft])}
                      >
                        Add
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAddingSharedSlug(false);
                          setNewSharedSlugDraft("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : null}

                {applyingSlugs ? (
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <span
                      aria-hidden="true"
                      className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900"
                    />
                    <span>Applying shared slugs...</span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {manualImportOpen ? (
            <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500" htmlFor="manual-image-url">
                    Manual Import
                  </label>
                  <input
                    id="manual-image-url"
                    aria-label="Manual image URL"
                    type="url"
                    value={manualImageUrl}
                    name="manual_image_url"
                    onChange={(event) => setManualImageUrl(event.target.value)}
                    placeholder="https://example.com/logo.svg"
                    className="min-h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
                  />
                  {manualImportError ? <p className="text-xs text-red-700">{manualImportError}</p> : null}
                </div>
                <Button variant="outline" onClick={onAddManualImageUrl}>
                  Import Image URL
                </Button>
              </div>
            </div>
          ) : null}

          {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

          <div className="mt-4 space-y-4">
            <div className="sticky top-0 z-10 -mx-4 overflow-x-auto border-y border-zinc-200 bg-white px-4 py-3 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
              <div className="flex min-w-max flex-wrap gap-2 pr-1">
                {sourceTabs.map((source) => {
                  const sourceStatus = sourceStatusBySource[source.source_provider] ?? (source.refreshable ? "idle" : "ready");
                  const hasLiveCount = Object.prototype.hasOwnProperty.call(discoveredCountBySource, source.source_provider);
                  const displayCount = hasLiveCount ? discoveredCountBySource[source.source_provider] : source.total_count;
                  const displayCountText =
                    source.refreshable && !hasLiveCount && (sourceStatus === "idle" || sourceStatus === "loading") ? "..." : String(displayCount);
                  return (
                    <button
                      key={source.source_provider}
                      type="button"
                      onClick={() => setActiveSource(source.source_provider)}
                      aria-label={`Filter options by ${source.source_provider} (${displayCountText})`}
                      className={joinClassNames(
                        "rounded-full border px-3 py-1 text-xs font-semibold transition",
                        activeSource === source.source_provider
                          ? "border-cyan-600 bg-cyan-600 text-white"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                      )}
                    >
                      {source.source_provider} ({displayCountText})
                    </button>
                  );
                })}
              </div>
            </div>

            {activeSourceRow ? (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2 lg:max-w-[220px]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Active Source</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-zinc-900 bg-zinc-900 px-3 py-1 text-xs font-semibold text-white">
                        {activeSourceRow.source_provider}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {activeSourceStatus === "saving"
                          ? "Saving query..."
                          : activeSourceStatus === "loading"
                            ? "Scraping candidates..."
                            : activeSourceStatus === "error"
                              ? "Refresh failed"
                              : "Ready"}
                      </span>
                    </div>
                    {activeSourceError ? <p className="text-xs text-red-700">{activeSourceError}</p> : null}
                  </div>

                  <div className="min-w-0 flex-1 space-y-2">
                    {activeSourceRow.editable ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Source Queries</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setAddingQueryBySource((previous) => ({
                                ...previous,
                                [activeSourceRow.source_provider]: true,
                              }))
                            }
                          >
                            Add Query
                          </Button>
                        </div>
                        {activeSourceQueryValues.map((queryValue, index) => (
                          <Editable
                            key={`${activeSourceRow.source_provider}:${queryValue}:${index}`}
                            value={queryValue}
                            placeholder={QUERY_PLACEHOLDERS[activeSourceRow.query_kind ?? "search_term"]}
                            onSubmit={(nextValue) => {
                              const nextQueryValues = [...activeSourceQueryValues];
                              if (nextValue.trim()) {
                                nextQueryValues[index] = nextValue;
                              } else {
                                nextQueryValues.splice(index, 1);
                              }
                              return saveSourceQueries(activeSourceRow.source_provider, nextQueryValues);
                            }}
                          >
                            <EditableArea>
                              <EditablePreview />
                              <EditableInput />
                            </EditableArea>
                            <EditableToolbar className="pt-1">
                              <EditableSubmit asChild>
                                <Button size="sm">Save</Button>
                              </EditableSubmit>
                              <EditableCancel asChild>
                                <Button variant="outline" size="sm">
                                  Cancel
                                </Button>
                              </EditableCancel>
                            </EditableToolbar>
                            <div className="pt-1">
                              <EditableTrigger asChild>
                                <Button variant="ghost" size="sm" className="w-fit">
                                  Edit {activeSourceRow.source_provider}
                                </Button>
                              </EditableTrigger>
                            </div>
                          </Editable>
                        ))}
                        {addingQueryBySource[activeSourceRow.source_provider] ? (
                          <div className="space-y-2 rounded-xl border border-dashed border-zinc-300 bg-white p-3">
                            <label
                              className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500"
                              htmlFor={`new-query-${activeSourceRow.source_provider}`}
                            >
                              New Query
                            </label>
                            <input
                              id={`new-query-${activeSourceRow.source_provider}`}
                              name={`new_query_${activeSourceRow.source_provider}`}
                              aria-label="New Query"
                              type="text"
                              value={newQueryDraftBySource[activeSourceRow.source_provider] ?? ""}
                              onChange={(event) =>
                                setNewQueryDraftBySource((previous) => ({
                                  ...previous,
                                  [activeSourceRow.source_provider]: event.target.value,
                                }))
                              }
                              placeholder={QUERY_PLACEHOLDERS[activeSourceRow.query_kind ?? "search_term"]}
                              className="min-h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
                            />
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                onClick={() =>
                                  void saveSourceQueries(activeSourceRow.source_provider, [
                                    ...activeSourceQueryValues,
                                    newQueryDraftBySource[activeSourceRow.source_provider] ?? "",
                                  ])
                                }
                              >
                                Add
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setAddingQueryBySource((previous) => ({
                                    ...previous,
                                    [activeSourceRow.source_provider]: false,
                                  }));
                                  setNewQueryDraftBySource((previous) => ({
                                    ...previous,
                                    [activeSourceRow.source_provider]: "",
                                  }));
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : null}
                        {renderSourceLinks(activeSourceRow.query_links)}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Source Queries</p>
                        <div className="space-y-2">
                          {activeSourceQueryValues.map((queryValue, index) => (
                            <div
                              key={`${activeSourceRow.source_provider}:readonly:${queryValue}:${index}`}
                              className="min-h-10 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
                            >
                              {queryValue}
                            </div>
                          ))}
                        </div>
                        {renderSourceLinks(activeSourceRow.query_links)}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    {activeSourceRow.refreshable ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          void refreshSource({
                            sourceProvider: activeSourceRow.source_provider,
                            sourceSnapshot: activeSourceRow,
                          })
                        }
                        disabled={activeSourceStatus === "loading" || activeSourceStatus === "saving"}
                      >
                        {activeSourceStatus === "loading" || activeSourceStatus === "saving"
                          ? `Refreshing ${activeSourceRow.source_provider}...`
                          : `Refresh ${activeSourceRow.source_provider}`}
                      </Button>
                    ) : (
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-400">Read only</span>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {sources.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-sm text-zinc-500">
                {loading ? "Loading source discovery..." : "No sources available."}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 py-4">
          {activeSourceError && !error ? (
            <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{activeSourceError}</p>
          ) : null}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Logo Results</p>
              <p className="text-sm text-zinc-600">
                {loading
                  ? "Loading available sources and saved logo options..."
                  : activeSource
                    ? `${allOptions.length} option${allOptions.length === 1 ? "" : "s"} for ${activeSource}`
                    : "Select a source."}
              </p>
              {activeSourceStatus === "loading" || activeSourceStatus === "saving" ? (
                <div className="mt-2 flex items-center gap-2 text-sm text-zinc-500">
                  <span
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900"
                  />
                  <span>{activeSourceStatus === "saving" ? "Refreshing media..." : "Scraping media..."}</span>
                </div>
              ) : null}
            </div>
            {activeSourceRow?.refreshable && discoverHasMoreBySource[activeSourceRow.source_provider] ? (
              <Button
                variant="outline"
                onClick={() => void onLoadMore()}
                disabled={activeSourceStatus === "loading" || activeSourceStatus === "saving"}
              >
                {activeSourceStatus === "loading" || activeSourceStatus === "saving" ? "Loading..." : "Load More"}
              </Button>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-3 pr-2">
            {!loading && activeSource && activeSourceStatus !== "loading" && activeSourceStatus !== "saving" && allOptions.length === 0 ? (
              <p className="text-sm text-zinc-500">No options found for this source.</p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {allOptions.map((option) => {
                const previewUrl = pickDisplayUrl(option) || PLACEHOLDER_ICON_PATH;
                const finalPreviewUrl = brokenPreviewIds[option.id] ? PLACEHOLDER_ICON_PATH : previewUrl;
                const isSelected = selectedOptionId ? selectedOptionId === option.id : Boolean(option.is_selected_for_role);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setSelectedOptionId(option.id)}
                    className={joinClassNames(
                      "rounded-2xl border p-3 text-left transition",
                      isSelected ? "border-zinc-900 bg-zinc-100" : "border-zinc-200 hover:bg-zinc-50",
                    )}
                    aria-pressed={isSelected}
                  >
                    <div className="relative h-16 w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
                      <Image
                        src={finalPreviewUrl}
                        alt={`${targetLabel} ${logoRole}`}
                        fill
                        className="object-contain p-2"
                        unoptimized
                        onError={() =>
                          setBrokenPreviewIds((previous) => ({
                            ...previous,
                            [option.id]: true,
                          }))
                        }
                      />
                    </div>
                    <p className="mt-3 truncate text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600">
                      {option.source_provider || "unknown"}
                    </p>
                    <p className="truncate text-xs text-zinc-500" title={option.discovered_from || option.source_url || "n/a"}>
                      {option.discovered_from || option.source_url || "n/a"}
                    </p>
                    <p className="mt-2 text-[11px] font-semibold text-zinc-500">
                      {isSelected ? "Selected as featured" : "Click to feature this option"}
                    </p>
                    {(option.option_kind || "stored") === "candidate" ? (
                      <p className="mt-2 text-[11px] font-semibold text-amber-700">Discovered option</p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 z-10 flex shrink-0 items-center justify-end gap-2 border-t border-zinc-200 bg-white px-4 py-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void onSave()} disabled={saving || !canSaveSelection}>
            {saving ? "Saving..." : `Save Featured${selectedOption ? " (1)" : " (0)"}`}
          </Button>
        </div>
      </div>
    </AdminModal>
  );
}
