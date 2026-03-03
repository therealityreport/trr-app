"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import AdminModal from "@/components/admin/AdminModal";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import type { User } from "firebase/auth";

type BrandLogoRole = "wordmark" | "icon";

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
  logo_role: BrandLogoRole;
  option_kind: "candidate";
};

type SourceSummary = {
  source_provider: string;
  total_count: number;
  has_more: boolean;
};

type InitialLoadResult = {
  options: LogoOptionRow[];
  sourceRowsRaw: SourceSummary[];
  errors: string[];
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
const REQUIRED_SOURCE_PROVIDERS: string[] = [
  "wikimedia_commons",
  "logos_fandom",
  "logos1000",
  "official_site",
  "brand_guidelines",
  "favicon_appicons",
  "worldvectorlogo",
  "seeklogo",
  "logowik",
  "logo_wine",
  "logosearch",
  "simple_icons",
];
const DISCOVERABLE_SOURCE_PROVIDERS = new Set(REQUIRED_SOURCE_PROVIDERS);
const RELATED_SOURCE_PROVIDER = "related_network_streaming";
const MANUAL_SOURCE_PROVIDER = "manual_import_url";
const SOURCE_PREFETCH_SIZE = 10;

const pickDisplayUrl = (row: LogoOptionRow | DiscoverCandidate): string | null =>
  row.hosted_logo_url || row.hosted_logo_black_url || row.hosted_logo_white_url || row.source_url || null;

const buildSourceRows = (
  existingRows: SourceSummary[],
  includeRelated: boolean,
  selectedProvider: string | null,
  storedOptions: LogoOptionRow[],
): SourceSummary[] => {
  const byProvider = new Map<string, SourceSummary>();
  for (const row of existingRows) {
    const provider = (row.source_provider || "").trim();
    if (!provider) continue;
    byProvider.set(provider, row);
  }

  const orderedProviders = includeRelated ? [RELATED_SOURCE_PROVIDER, ...REQUIRED_SOURCE_PROVIDERS] : REQUIRED_SOURCE_PROVIDERS;
  const rows: SourceSummary[] = orderedProviders.map((provider) => {
    const existing = byProvider.get(provider);
    if (existing) {
      return existing;
    }
    return {
      source_provider: provider,
      total_count: 0,
      has_more: DISCOVERABLE_SOURCE_PROVIDERS.has(provider),
    };
  });

  for (const row of existingRows) {
    if (!rows.some((entry) => entry.source_provider === row.source_provider)) {
      rows.push(row);
    }
  }

  const normalizedSelected = (selectedProvider || "").trim();
  if (normalizedSelected && !rows.some((entry) => entry.source_provider === normalizedSelected)) {
    rows.push({
      source_provider: normalizedSelected,
      total_count: storedOptions.filter((row) => (row.source_provider || "unknown") === normalizedSelected).length,
      has_more: DISCOVERABLE_SOURCE_PROVIDERS.has(normalizedSelected),
    });
  }

  return rows;
};

const parseErrorPayload = async (response: Response): Promise<string> => {
  const fallback = `Request failed (${response.status})`;
  try {
    const payload = (await response.json()) as { error?: string; detail?: string; message?: string };
    if (typeof payload.error === "string") return payload.error;
    if (typeof payload.detail === "string") return payload.detail;
    if (typeof payload.message === "string") return payload.message;
  } catch {
    return fallback;
  }
  return fallback;
};

const normalizeLogoOptionsErrorMessage = (message: string): string => {
  const normalized = (message || "").toLowerCase();
  if (
    normalized.includes("hosted_logo_black_url")
    || normalized.includes("hosted_logo_white_url")
    || (normalized.includes("does not exist") && normalized.includes("hosted_logo"))
  ) {
    return "Related logo pairing temporarily unavailable; discovery sources are still usable.";
  }
  return message;
};

const isSchemaVariantError = (message: string): boolean => {
  const normalized = (message || "").toLowerCase();
  return (
    normalized.includes("hosted_logo_black_url")
    || normalized.includes("hosted_logo_white_url")
    || (normalized.includes("does not exist") && normalized.includes("hosted_logo"))
  );
};

const isHttpImageUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const manualCandidateId = (url: string, role: BrandLogoRole): string =>
  `candidate:manual:${encodeURIComponent(`${role}:${url}`)}`;

const normalizeHost = (value: string): string => {
  const text = value.trim();
  if (!text) return "";
  try {
    const parsed = new URL(text.includes("://") ? text : `https://${text}`);
    return parsed.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return text.replace(/^www\./i, "").toLowerCase();
  }
};

const deriveBrandSearchTerm = (targetLabel: string, targetKey: string): string => {
  const host = normalizeHost(targetKey || targetLabel);
  if (host) {
    const parts = host.split(".");
    const stem = parts[0] === "www" || parts[0] === "m" || parts[0] === "en" ? parts[1] || parts[0] : parts[0];
    const cleanedStem = (stem || "")
      .replace(/[_-]+/g, " ")
      .replace(/[^a-zA-Z0-9 ]+/g, " ")
      .trim();
    if (cleanedStem) return cleanedStem;
  }
  const cleanedLabel = (targetLabel || "")
    .replace(/[_-]+/g, " ")
    .replace(/[^a-zA-Z0-9 ]+/g, " ")
    .trim();
  return cleanedLabel || targetKey || "brand";
};

const buildSourceQueryUrl = (sourceProvider: string, queryTerm: string, targetKey: string): string | string[] => {
  const encoded = encodeURIComponent(queryTerm);
  const targetHost = normalizeHost(targetKey);
  switch (sourceProvider) {
    case RELATED_SOURCE_PROVIDER:
      return targetHost ? `host match: ${targetHost}` : "host match";
    case "wikimedia_commons":
      return [
        `https://commons.wikimedia.org/w/index.php?search=${encoded}%20logo&title=Special%3AMediaSearch&type=image&filemime=svg`,
        `https://commons.wikimedia.org/w/index.php?search=${encoded}%20icon&title=Special%3AMediaSearch&type=image&filemime=svg`,
      ];
    case "logos_fandom":
      return `https://logos.fandom.com/wiki/Special:Search?query=${encoded}`;
    case "logos1000":
      return `https://1000logos.net/?s=${encoded}`;
    case "official_site":
      return targetHost ? `https://${targetHost}` : "https://";
    case "brand_guidelines":
      return targetHost ? `https://${targetHost}` : "https://";
    case "favicon_appicons":
      return targetHost ? `https://${targetHost}` : "https://";
    case "worldvectorlogo":
      return `https://worldvectorlogo.com/search?q=${encoded}`;
    case "seeklogo":
      return `https://seeklogo.com/search?q=${encoded}`;
    case "logowik":
      return `https://logowik.com/search?q=${encoded}`;
    case "logo_wine":
      return `https://www.logo.wine/?s=${encoded}`;
    case "logosearch":
      return `https://logosear.ch/search.html?q=${encoded}`;
    case "simple_icons":
      return `https://simpleicons.org/?q=${encoded}`;
    case MANUAL_SOURCE_PROVIDER:
      return "manual URL input";
    default:
      return queryTerm;
  }
};

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
  const [discoveredOptions, setDiscoveredOptions] = useState<DiscoverCandidate[]>([]);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [discoverOffsetBySource, setDiscoverOffsetBySource] = useState<Record<string, number>>({});
  const [discoverHasMoreBySource, setDiscoverHasMoreBySource] = useState<Record<string, boolean>>({});
  const [discoveredCountBySource, setDiscoveredCountBySource] = useState<Record<string, number>>({});
  const [discoverIncludeRelated, setDiscoverIncludeRelated] = useState(false);
  const [prefetchingSources, setPrefetchingSources] = useState(false);
  const [manualImageUrl, setManualImageUrl] = useState("");
  const [manualImportOpen, setManualImportOpen] = useState(false);
  const [manualImportError, setManualImportError] = useState<string | null>(null);
  const [brokenPreviewIds, setBrokenPreviewIds] = useState<Record<string, boolean>>({});

  const includeRelated = targetType === "publication" || targetType === "social";

  const fetchWithAuth = useCallback(
    (input: RequestInfo | URL, init?: RequestInit) =>
      fetchAdminWithAuth(input, init, {
        preferredUser,
        allowDevAdminBypass: true,
      }),
    [preferredUser],
  );

  const loadForIncludeRelated = useCallback(
    async (related: boolean): Promise<InitialLoadResult> => {
      const logosParams = new URLSearchParams({
        target_type: targetType,
        target_key: targetKey,
        logo_role: logoRole,
        include_related: related ? "true" : "false",
        limit: "500",
      });
      const [logosResponse, sourcesResponse] = await Promise.all([
        fetchWithAuth(`/api/admin/trr-api/brands/logos?${logosParams.toString()}`, { cache: "no-store" }),
        fetchWithAuth(
          `/api/admin/trr-api/brands/logos/options/sources?target_type=${encodeURIComponent(targetType)}&target_key=${encodeURIComponent(
            targetKey,
          )}&logo_role=${encodeURIComponent(logoRole)}&include_related=${related ? "true" : "false"}`,
          { cache: "no-store" },
        ),
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
    [fetchWithAuth, logoRole, targetKey, targetType],
  );

  const discoverBySource = useCallback(
    async (sourceProvider: string, offset: number, limit: number, related: boolean) => {
      const response = await fetchWithAuth("/api/admin/trr-api/brands/logos/options/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_type: targetType,
          target_key: targetKey,
          target_label: targetLabel,
          logo_role: logoRole,
          source_provider: sourceProvider,
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
        next_offset?: number;
        has_more?: boolean;
      };
      return {
        candidates: (Array.isArray(payload.candidates) ? payload.candidates : []).map((row) => ({
          ...row,
          option_kind: "candidate" as const,
        })),
        nextOffset: Number(payload.next_offset ?? offset),
        hasMore: Boolean(payload.has_more),
      };
    },
    [fetchWithAuth, logoRole, targetKey, targetLabel, targetType],
  );

  const upsertDiscoveredCandidates = useCallback((sourceProvider: string, candidates: DiscoverCandidate[]) => {
    if (candidates.length === 0) return;
    setDiscoveredOptions((previous) => {
      const existingById = new Set(previous.map((row) => row.id));
      const existingByUrl = new Set(previous.map((row) => `${row.source_provider || "unknown"}|${row.source_url}`));
      const next = [...previous];
      let added = 0;
      for (const candidate of candidates) {
        const candidateKey = `${candidate.source_provider || "unknown"}|${candidate.source_url}`;
        if (existingById.has(candidate.id) || existingByUrl.has(candidateKey)) {
          continue;
        }
        existingById.add(candidate.id);
        existingByUrl.add(candidateKey);
        next.push(candidate);
        added += 1;
      }
      if (added > 0) {
        setDiscoveredCountBySource((counts) => ({
          ...counts,
          [sourceProvider]: (counts[sourceProvider] ?? 0) + added,
        }));
      }
      return next;
    });
  }, []);

  const prefetchSourceCandidates = useCallback(
    async (sourceRows: SourceSummary[], related: boolean) => {
      const providers = sourceRows
        .map((row) => row.source_provider)
        .filter(
          (provider) =>
            provider !== RELATED_SOURCE_PROVIDER
            && provider !== MANUAL_SOURCE_PROVIDER
            && DISCOVERABLE_SOURCE_PROVIDERS.has(provider),
        );
      if (providers.length === 0) {
        return;
      }
      setPrefetchingSources(true);
      await Promise.all(
        providers.map(async (provider) => {
          try {
            const payload = await discoverBySource(provider, 0, SOURCE_PREFETCH_SIZE, related);
            upsertDiscoveredCandidates(provider, payload.candidates);
            setDiscoverOffsetBySource((previous) => ({
              ...previous,
              [provider]: payload.nextOffset,
            }));
            setDiscoverHasMoreBySource((previous) => ({
              ...previous,
              [provider]: payload.hasMore,
            }));
          } catch {
            setDiscoverHasMoreBySource((previous) => ({
              ...previous,
              [provider]: previous[provider] ?? true,
            }));
          }
        }),
      );
      setPrefetchingSources(false);
    },
    [discoverBySource, upsertDiscoveredCandidates],
  );

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    setManualImportError(null);
    setManualImageUrl("");
    setBrokenPreviewIds({});
    setDiscoveredCountBySource({});
    setDiscoverOffsetBySource({});
    setDiscoveredOptions([]);
    setSelectedOptionIds([]);
    setPrefetchingSources(false);
    const fallbackSourceRows = buildSourceRows([], includeRelated, null, []);
    setSources(fallbackSourceRows);
    setActiveSource(fallbackSourceRows[0]?.source_provider || null);
    const initialHasMoreMap: Record<string, boolean> = {};
    for (const source of fallbackSourceRows) {
      initialHasMoreMap[source.source_provider] = source.has_more;
    }
    setDiscoverHasMoreBySource(initialHasMoreMap);
    setDiscoverIncludeRelated(includeRelated);
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

      const selectedStored = options.find((row) => row.is_selected_for_role);
      const sourceRows = buildSourceRows(sourceRowsRaw, includeRelated, selectedStored?.source_provider || null, options);
      setStoredOptions(options);
      setSources(sourceRows);
      setDiscoverIncludeRelated(relatedForDiscovery);
      setSelectedOptionIds(selectedStored?.id ? [selectedStored.id] : []);
      const nextActiveSource = selectedStored?.source_provider || sourceRows[0]?.source_provider || null;
      setActiveSource(nextActiveSource);
      const hasMoreMap: Record<string, boolean> = {};
      for (const source of sourceRows) {
        hasMoreMap[source.source_provider] = source.has_more;
      }
      setDiscoverHasMoreBySource(hasMoreMap);
      if (showRelatedFallbackWarning) {
        setError("Related logo pairing temporarily unavailable; discovery sources are still usable.");
      } else if (loadErrors.length > 0) {
        setError(normalizeLogoOptionsErrorMessage(loadErrors[0] || "Failed to load logo options"));
      }
      void prefetchSourceCandidates(sourceRows, relatedForDiscovery);
    } catch (loadError) {
      setError(
        normalizeLogoOptionsErrorMessage(loadError instanceof Error ? loadError.message : "Failed to load logo options"),
      );
      setStoredOptions([]);
      setSources(fallbackSourceRows);
      setActiveSource(fallbackSourceRows[0]?.source_provider || null);
      setSelectedOptionIds([]);
      const hasMoreMap: Record<string, boolean> = {};
      for (const source of fallbackSourceRows) {
        hasMoreMap[source.source_provider] = source.has_more;
      }
      setDiscoverHasMoreBySource(hasMoreMap);
    } finally {
      setLoading(false);
    }
  }, [includeRelated, loadForIncludeRelated, prefetchSourceCandidates]);

  useEffect(() => {
    if (!isOpen) return;
    void loadInitial();
  }, [isOpen, loadInitial]);

  const allOptions = useMemo(() => {
    const merged: Array<LogoOptionRow | DiscoverCandidate> = [...storedOptions, ...discoveredOptions];
    if (!activeSource) return merged;
    return merged.filter((row) => (row.source_provider || "unknown") === activeSource);
  }, [activeSource, discoveredOptions, storedOptions]);

  const optionsById = useMemo(() => {
    const map = new Map<string, LogoOptionRow | DiscoverCandidate>();
    for (const row of [...storedOptions, ...discoveredOptions]) {
      map.set(row.id, row);
    }
    return map;
  }, [discoveredOptions, storedOptions]);

  const selectedOptions = useMemo(
    () =>
      selectedOptionIds
        .map((id) => optionsById.get(id))
        .filter((row): row is LogoOptionRow | DiscoverCandidate => Boolean(row)),
    [optionsById, selectedOptionIds],
  );

  const brandSearchTerm = useMemo(() => deriveBrandSearchTerm(targetLabel, targetKey), [targetKey, targetLabel]);

  const sourceDisplayRows = useMemo(
    () =>
      sources.map((source) => ({
        ...source,
        total_count: discoveredCountBySource[source.source_provider] ?? 0,
      })),
    [discoveredCountBySource, sources],
  );

  const sourceQueryRows = useMemo(
    () =>
      sourceDisplayRows.map((source) => ({
        source_provider: source.source_provider,
        query_url: buildSourceQueryUrl(source.source_provider, brandSearchTerm, targetKey),
      })),
    [brandSearchTerm, sourceDisplayRows, targetKey],
  );

  const activeSourceQuery = useMemo(() => {
    if (!activeSource) return sourceQueryRows[0] ?? null;
    return sourceQueryRows.find((row) => row.source_provider === activeSource) ?? null;
  }, [activeSource, sourceQueryRows]);

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
    setDiscoveredOptions((previous) => {
      if (
        previous.some(
          (row) =>
            row.source_provider === candidate.source_provider
            && row.source_url === candidate.source_url
            && row.logo_role === candidate.logo_role,
        )
      ) {
        return previous;
      }
      return [...previous, candidate];
    });
    setDiscoveredCountBySource((previous) => ({
      ...previous,
      [MANUAL_SOURCE_PROVIDER]: Math.max(1, previous[MANUAL_SOURCE_PROVIDER] ?? 0),
    }));
    setSources((previous) => {
      if (previous.some((row) => row.source_provider === MANUAL_SOURCE_PROVIDER)) {
        return previous;
      }
      return [
        ...previous,
        {
          source_provider: MANUAL_SOURCE_PROVIDER,
          total_count: 0,
          has_more: false,
        },
      ];
    });
    setDiscoverHasMoreBySource((previous) => ({
      ...previous,
      [MANUAL_SOURCE_PROVIDER]: false,
    }));
    setActiveSource(MANUAL_SOURCE_PROVIDER);
    setSelectedOptionIds((previous) => (previous.includes(candidate.id) ? previous : [...previous, candidate.id]));
    setManualImageUrl("");
  }, [logoRole, manualImageUrl]);

  const onLoadMore = useCallback(async () => {
    if (!activeSource) return;
    const currentOffset = discoverOffsetBySource[activeSource] ?? 0;
    setLoading(true);
    setError(null);
    try {
      const payload = await discoverBySource(activeSource, currentOffset, SOURCE_PREFETCH_SIZE, discoverIncludeRelated);
      upsertDiscoveredCandidates(activeSource, payload.candidates);
      setDiscoverOffsetBySource((previous) => ({
        ...previous,
        [activeSource]: payload.nextOffset,
      }));
      setDiscoverHasMoreBySource((previous) => ({
        ...previous,
        [activeSource]: payload.hasMore,
      }));
    } catch (loadError) {
      setError(
        normalizeLogoOptionsErrorMessage(loadError instanceof Error ? loadError.message : "Failed to discover more options"),
      );
    } finally {
      setLoading(false);
    }
  }, [activeSource, discoverBySource, discoverIncludeRelated, discoverOffsetBySource, upsertDiscoveredCandidates]);

  const onSave = useCallback(async () => {
    if (selectedOptions.length === 0) {
      setError("Select at least one logo option before saving.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      for (const selectedOption of selectedOptions) {
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
      }
      await onSaved();
      onClose();
    } catch (saveError) {
      setError(
        normalizeLogoOptionsErrorMessage(saveError instanceof Error ? saveError.message : "Failed to save selected logo option"),
      );
    } finally {
      setSaving(false);
    }
  }, [fetchWithAuth, logoRole, onClose, onSaved, selectedOptions, targetKey, targetLabel, targetType]);

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${logoRole === "wordmark" ? "Wordmark" : "Icon"} Options • ${targetLabel}`}
      panelClassName="max-h-[90vh] max-w-5xl overflow-hidden p-0"
    >
      <div className="flex h-full max-h-[90vh] flex-col">
        <div className="border-b border-zinc-200 px-4 py-3">
          <div className="mb-2 text-[11px] text-zinc-600">
            <p className="font-semibold uppercase tracking-[0.08em] text-zinc-500">Source Queries</p>
            {activeSourceQuery ? (
              <p className="mt-1 truncate">
                <span className="font-semibold">{activeSourceQuery.source_provider}:</span>{" "}
                {Array.isArray(activeSourceQuery.query_url) ? (
                  <span className="text-zinc-500">
                    {activeSourceQuery.query_url.map((queryUrl, index) => (
                      <span key={queryUrl}>
                        {index > 0 ? " | " : ""}
                        {isHttpImageUrl(queryUrl) ? (
                          <a
                            href={queryUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="underline decoration-zinc-300 underline-offset-2 hover:text-zinc-700"
                          >
                            {queryUrl}
                          </a>
                        ) : (
                          queryUrl
                        )}
                      </span>
                    ))}
                  </span>
                ) : isHttpImageUrl(activeSourceQuery.query_url) ? (
                  <a
                    href={activeSourceQuery.query_url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-zinc-500 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-700"
                  >
                    {activeSourceQuery.query_url}
                  </a>
                ) : (
                  <span className="text-zinc-500">{activeSourceQuery.query_url}</span>
                )}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {sources.length === 0 ? (
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-500">No sources</span>
            ) : (
              sourceDisplayRows.map((source) => (
                <button
                  key={source.source_provider}
                  type="button"
                  onClick={() => setActiveSource(source.source_provider)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    activeSource === source.source_provider
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-700"
                  }`}
                >
                  {source.source_provider} ({source.total_count})
                </button>
              ))
            )}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="mb-3">
            <button
              type="button"
              onClick={() => setManualImportOpen((previous) => !previous)}
              className="rounded border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              {manualImportOpen ? "Hide Manual Import" : "Add Manual Import"}
            </button>
          </div>
          {error ? <p className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          {(loading || prefetchingSources) && allOptions.length === 0 ? (
            <p className="text-sm text-zinc-500">Loading options...</p>
          ) : null}
          {!loading && !prefetchingSources && allOptions.length === 0 ? (
            <p className="text-sm text-zinc-500">No options found for this source.</p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {allOptions.map((option) => {
              const previewUrl = pickDisplayUrl(option) || PLACEHOLDER_ICON_PATH;
              const finalPreviewUrl = brokenPreviewIds[option.id] ? PLACEHOLDER_ICON_PATH : previewUrl;
              const isSelected = selectedOptionIds.includes(option.id) || Boolean(option.is_selected_for_role);
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setSelectedOptionIds((previous) =>
                      previous.includes(option.id)
                        ? previous.filter((id) => id !== option.id)
                        : [...previous, option.id],
                    );
                  }}
                  className={`rounded-lg border p-2 text-left transition ${
                    isSelected ? "border-zinc-900 bg-zinc-100" : "border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  <div className="relative h-14 w-full overflow-hidden rounded border border-zinc-200 bg-zinc-50">
                    <Image
                      src={finalPreviewUrl}
                      alt={`${targetLabel} ${logoRole}`}
                      fill
                      className="object-contain p-1"
                      unoptimized
                      onError={() =>
                        setBrokenPreviewIds((previous) => ({
                          ...previous,
                          [option.id]: true,
                        }))
                      }
                    />
                  </div>
                  <p className="mt-2 truncate text-xs font-semibold uppercase tracking-[0.08em] text-zinc-600">
                    {option.source_provider || "unknown"}
                  </p>
                  <p className="truncate text-xs text-zinc-500">{option.discovered_from || option.source_url || "n/a"}</p>
                  {(option.option_kind || "stored") === "candidate" ? (
                    <p className="mt-1 text-[11px] font-semibold text-amber-700">Discovered option</p>
                  ) : null}
                </button>
              );
            })}
          </div>
          {activeSource && discoverHasMoreBySource[activeSource] ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => void onLoadMore()}
                disabled={loading || prefetchingSources}
                className="rounded border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50"
              >
                {loading || prefetchingSources ? "Loading..." : "Load More"}
              </button>
            </div>
          ) : null}
          {manualImportOpen ? (
            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-600">Manual Import</p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  aria-label="Manual image URL"
                  type="url"
                  value={manualImageUrl}
                  onChange={(event) => setManualImageUrl(event.target.value)}
                  placeholder="https://example.com/logo.svg"
                  className="w-full rounded border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                />
                <button
                  type="button"
                  onClick={onAddManualImageUrl}
                  className="rounded border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                >
                  Import Image URL
                </button>
              </div>
              {manualImportError ? <p className="mt-2 text-xs text-red-700">{manualImportError}</p> : null}
            </div>
          ) : null}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-zinc-200 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={saving || selectedOptions.length === 0}
            className="rounded bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
          >
            {saving ? "Saving..." : `Save Selected (${selectedOptions.length})`}
          </button>
        </div>
      </div>
    </AdminModal>
  );
}
