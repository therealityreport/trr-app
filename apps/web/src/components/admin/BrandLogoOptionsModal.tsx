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
type ModalTargetType =
  | "show"
  | "network"
  | "streaming"
  | "production"
  | "franchise"
  | "publication"
  | "social"
  | "other";

type LogoOptionBase = {
  id: string;
  source_url: string | null;
  source_provider?: string | null;
  discovered_from?: string | null;
  hosted_logo_url?: string | null;
  hosted_logo_black_url?: string | null;
  hosted_logo_white_url?: string | null;
  option_kind?: string | null;
  file_type?: string | null;
  content_type?: string | null;
  width?: number | null;
  height?: number | null;
  aspect_ratio?: number | null;
  logo_role?: BrandLogoRole | null;
  detected_logo_role?: BrandLogoRole | null;
};

type SavedLogoAsset = LogoOptionBase & {
  selected_roles?: BrandLogoRole[];
};

type DiscoverCandidate = LogoOptionBase & {
  source_url: string;
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
};

type SourceQuerySaveResponse = {
  source?: SourceSummary;
};

type SourceSuggestion = {
  query_value: string;
  query_link: string;
  reason?: string | null;
  discovered_from?: string | null;
};

type SourceSuggestionResponse = {
  suggestions?: SourceSuggestion[];
};

type ModalStateResponse = {
  saved_assets?: SavedLogoAsset[];
  featured_assets?: Partial<Record<BrandLogoRole, SavedLogoAsset | null>>;
  sources?: SourceSummary[];
};

type DiscoverResponse = {
  candidates?: DiscoverCandidate[];
  has_more?: boolean;
  next_offset?: number;
  total_count?: number;
};

type BrandLogoOptionsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  preferredUser: User | null;
  targetType: ModalTargetType;
  targetKey: string;
  targetLabel: string;
  onSaved: () => Promise<void> | void;
};

type LogoCardProps = {
  option: SavedLogoAsset | DiscoverCandidate;
  isSaved: boolean;
  selected: boolean;
  targetLabel: string;
  onClick?: () => void;
  disabled?: boolean;
};

const PLACEHOLDER_ICON_PATH = "/icons/brand-placeholder.svg";
const MANUAL_SOURCE_PROVIDER = "manual_import_url";
const SAVED_SOURCE_PROVIDER = "saved";
const SOURCE_PREFETCH_SIZE = 20;
const SOURCE_PREFETCH_CONCURRENCY = 3;
const SHARED_SOURCE_QUERY_ROLES: BrandLogoRole[] = ["wordmark", "icon"];
const SHARED_SLUG_SOURCE_KINDS: SourceQueryKind[] = ["slug", "search_term"];

const QUERY_PLACEHOLDERS: Record<SourceQueryKind, string> = {
  search_term: "Enter search term",
  slug: "Enter source path slug",
  host_or_url: "Enter source host or URL",
  readonly: "",
};

const buildBrandLogoPreviewProxyUrl = (sourceUrl: string): string =>
  `/api/admin/trr-api/brands/logos/options/preview?url=${encodeURIComponent(sourceUrl)}`;

const pickDisplayUrl = (row: LogoOptionBase): string | null => {
  const hostedUrl = row.hosted_logo_url || row.hosted_logo_black_url || row.hosted_logo_white_url || null;
  if (hostedUrl) return hostedUrl;

  if (row.option_kind === "candidate" && row.source_provider === "logos_fandom" && row.source_url) {
    return buildBrandLogoPreviewProxyUrl(row.source_url);
  }

  return row.source_url || null;
};

const joinClassNames = (...values: Array<string | false | null | undefined>): string => values.filter(Boolean).join(" ");

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

const formatProviderLabel = (value: string | null | undefined): string =>
  String(value || "unknown")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const formatDimensions = (width: number | null | undefined, height: number | null | undefined): string | null => {
  if (!width || !height) return null;
  return `${width}x${height}`;
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

const inferFileTypeFromHint = (value: string | null | undefined): string | null => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("svg")) return "svg";
  if (normalized.includes("png")) return "png";
  if (normalized.includes("webp")) return "webp";
  if (normalized.includes("jpeg") || normalized.includes("jpg")) return "jpg";
  if (normalized.includes("gif")) return "gif";
  if (normalized.includes("avif")) return "avif";
  return null;
};

const inferFileTypeFromUrl = (value: string): string | null => {
  try {
    const parsed = new URL(value);
    const extensionMatch = parsed.pathname.match(/\.([a-z0-9]+)$/i);
    const extension = inferFileTypeFromHint(extensionMatch?.[1] ?? null);
    if (extension) return extension;
    const hinted = inferFileTypeFromHint(
      parsed.searchParams.get("format")
      || parsed.searchParams.get("fm")
      || parsed.searchParams.get("ext")
      || parsed.searchParams.get("fileType")
      || parsed.searchParams.get("contentType")
      || parsed.searchParams.get("mime"),
    );
    if (hinted) return hinted;
  } catch {
    return null;
  }
  return null;
};

const manualCandidateId = (url: string): string => `candidate:manual:${encodeURIComponent(url)}`;

const getOptionPreferredRole = (option: SavedLogoAsset | DiscoverCandidate): BrandLogoRole => {
  if (option.detected_logo_role === "icon" || option.logo_role === "icon") return "icon";
  if (Array.isArray((option as SavedLogoAsset).selected_roles) && (option as SavedLogoAsset).selected_roles?.includes("icon")) {
    return "icon";
  }
  return "wordmark";
};

async function parseErrorPayload(response: Response): Promise<string> {
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
}

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

function getEmptyStateMessage({
  activeSource,
  activeSourceRow,
  activeSourceStatus,
  activeSourceError,
  relatedFallbackActive,
}: {
  activeSource: string | null;
  activeSourceRow: SourceSummary | null;
  activeSourceStatus: SourceStatus | undefined;
  activeSourceError: string | null | undefined;
  relatedFallbackActive: boolean;
}): string {
  if (!activeSource) return "Select a source.";
  if (activeSourceStatus === "loading") return `Loading candidates for ${activeSource}...`;
  if (activeSourceError || activeSourceStatus === "error") {
    return `Refreshing ${activeSource} failed. Update the query or try refreshing again.`;
  }
  if (activeSource === SAVED_SOURCE_PROVIDER) {
    return "No saved assets yet. Save or assign a discovered asset to build the shared library.";
  }
  if (activeSource === MANUAL_SOURCE_PROVIDER) {
    return "Add a manual image URL to create options here.";
  }
  if (relatedFallbackActive && activeSourceRow?.refreshable) {
    return "No candidates found. Related-logo fallback mode is active, so only direct source matches are currently available.";
  }
  return "No candidates found for this source.";
}

function LogoCard({
  option,
  isSaved,
  selected,
  targetLabel,
  onClick,
  disabled = false,
}: LogoCardProps) {
  const metadataBits = [
    option.file_type ? option.file_type.toUpperCase() : null,
    formatDimensions(option.width, option.height),
  ].filter(Boolean);
  const selectedRoles = isSaved && Array.isArray((option as SavedLogoAsset).selected_roles)
    ? (option as SavedLogoAsset).selected_roles ?? []
    : [];

  return (
    <div
      className={joinClassNames(
        "rounded-2xl border p-3 transition",
        selected ? "border-zinc-900 bg-zinc-100" : "border-zinc-200 bg-white hover:bg-zinc-50",
      )}
    >
      <div
        role={onClick ? "button" : undefined}
        aria-pressed={onClick ? selected : undefined}
        aria-label={onClick ? `${targetLabel} option${selected ? " selected" : ""}` : undefined}
        tabIndex={onClick ? 0 : undefined}
        onClick={disabled ? undefined : onClick}
        onKeyDown={(event) => {
          if (!onClick || disabled) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick();
          }
        }}
        className={joinClassNames(
          "rounded-xl outline-none",
          onClick ? "cursor-pointer focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2" : "",
          disabled ? "cursor-not-allowed opacity-70" : "",
        )}
      >
        <div className="relative h-20 w-full overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
          <Image
            src={pickDisplayUrl(option) || PLACEHOLDER_ICON_PATH}
            alt={`${targetLabel} option`}
            fill
            className="object-contain p-2"
            unoptimized
          />
        </div>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-zinc-600">
              {formatProviderLabel(option.source_provider)}
            </p>
            <p className="truncate text-xs text-zinc-500" title={option.discovered_from || option.source_url || "n/a"}>
              {option.discovered_from || option.source_url || "n/a"}
            </p>
          </div>
          {selectedRoles.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {selectedRoles.map((role) => (
                <span key={`${option.id}:${role}`} className="rounded-full bg-cyan-100 px-2 py-1 text-[11px] font-semibold text-cyan-800">
                  {role}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        {metadataBits.length > 0 ? (
          <p className="mt-2 text-[11px] font-semibold text-zinc-500">{metadataBits.join(" · ")}</p>
        ) : null}
      </div>
      {isSaved ? (
        <p className="mt-3 text-[11px] text-zinc-500">Saved library asset</p>
      ) : null}
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
  onSaved,
}: BrandLogoOptionsModalProps) {
  const includeRelated = targetType === "publication" || targetType === "social";
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasPersistedChanges, setHasPersistedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [relatedFallbackActive, setRelatedFallbackActive] = useState(false);
  const [sources, setSources] = useState<SourceSummary[]>([]);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [savedAssets, setSavedAssets] = useState<SavedLogoAsset[]>([]);
  const [discoveredOptionsBySource, setDiscoveredOptionsBySource] = useState<Record<string, DiscoverCandidate[]>>({});
  const [selectedOptionIdsBySource, setSelectedOptionIdsBySource] = useState<Record<string, string[]>>({});
  const [discoverOffsetBySource, setDiscoverOffsetBySource] = useState<Record<string, number>>({});
  const [discoverHasMoreBySource, setDiscoverHasMoreBySource] = useState<Record<string, boolean>>({});
  const [discoveredCountBySource, setDiscoveredCountBySource] = useState<Record<string, number>>({});
  const [sourceStatusBySource, setSourceStatusBySource] = useState<Record<string, SourceStatus>>({});
  const [sourceErrorBySource, setSourceErrorBySource] = useState<Record<string, string | null>>({});
  const [manualImageUrl, setManualImageUrl] = useState("");
  const [manualImportOpen, setManualImportOpen] = useState(false);
  const [manualImportError, setManualImportError] = useState<string | null>(null);
  const [slugPanelOpen, setSlugPanelOpen] = useState(false);
  const [sharedSlugs, setSharedSlugs] = useState<string[]>([]);
  const [addingSharedSlug, setAddingSharedSlug] = useState(false);
  const [newSharedSlugDraft, setNewSharedSlugDraft] = useState("");
  const [applyingSlugs, setApplyingSlugs] = useState(false);
  const [addingQueryBySource, setAddingQueryBySource] = useState<Record<string, boolean>>({});
  const [newQueryDraftBySource, setNewQueryDraftBySource] = useState<Record<string, string>>({});
  const [sourceSuggestionsBySource, setSourceSuggestionsBySource] = useState<Record<string, SourceSuggestion[]>>({});
  const [sourceSuggestionsLoadingBySource, setSourceSuggestionsLoadingBySource] = useState<Record<string, boolean>>({});
  const [sourceSuggestionsErrorBySource, setSourceSuggestionsErrorBySource] = useState<Record<string, string | null>>({});
  const sourcesRef = useRef<SourceSummary[]>([]);
  const discoverOffsetBySourceRef = useRef<Record<string, number>>({});
  const discoveredOptionsBySourceRef = useRef<Record<string, DiscoverCandidate[]>>({});
  const resultsScrollRef = useRef<HTMLDivElement | null>(null);
  const modalSessionRef = useRef(0);
  const modalLoadRequestIdRef = useRef(0);
  const mutationRefreshRequestIdRef = useRef(0);
  const sourceRefreshRequestIdRef = useRef<Record<string, number>>({});
  const suggestionRequestIdRef = useRef<Record<string, number>>({});

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
    discoveredOptionsBySourceRef.current = discoveredOptionsBySource;
  }, [discoveredOptionsBySource]);

  const resetResultsScroll = useCallback(() => {
    const node = resultsScrollRef.current;
    if (!node) return;
    if (typeof node.scrollTo === "function") {
      node.scrollTo({ top: 0 });
    }
    node.scrollTop = 0;
  }, []);

  const hydrateFromModalPayload = useCallback((
    payload: ModalStateResponse,
    options?: { preferredActiveSource?: string | null },
  ) => {
    const nextSavedAssets = Array.isArray(payload.saved_assets) ? payload.saved_assets : [];
    const nextSources = Array.isArray(payload.sources) ? payload.sources : [];
    setSavedAssets(nextSavedAssets);
    setSources(nextSources);
    setSharedSlugs(deriveSharedSlugsFromSources(nextSources));
    setDiscoverHasMoreBySource(
      Object.fromEntries(nextSources.map((source) => [source.source_provider, Boolean(source.has_more)])),
    );
    setSourceStatusBySource(
      Object.fromEntries(
        nextSources.map((source) => [source.source_provider, source.refreshable ? ("idle" as const) : ("ready" as const)]),
      ),
    );
    setActiveSource((previous) => {
      const preferredActiveSource = options?.preferredActiveSource ?? null;
      if (
        preferredActiveSource
        && (
          preferredActiveSource === SAVED_SOURCE_PROVIDER
          || preferredActiveSource === MANUAL_SOURCE_PROVIDER
          || nextSources.some((source) => source.source_provider === preferredActiveSource)
        )
      ) {
        return preferredActiveSource;
      }
      if (previous && (previous === SAVED_SOURCE_PROVIDER || previous === MANUAL_SOURCE_PROVIDER || nextSources.some((source) => source.source_provider === previous))) {
        return previous;
      }
      return nextSavedAssets.length > 0 ? SAVED_SOURCE_PROVIDER : nextSources[0]?.source_provider ?? null;
    });
  }, []);

  const loadModalState = useCallback(async (related: boolean): Promise<ModalStateResponse> => {
    const params = new URLSearchParams({
      target_type: targetType,
      target_key: targetKey,
      target_label: targetLabel,
      include_related: related ? "true" : "false",
    });
    const response = await fetchWithAuth(`/api/admin/trr-api/brands/logos/options/modal?${params.toString()}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(normalizeLogoOptionsErrorMessage(await parseErrorPayload(response)));
    }
    return (await response.json()) as ModalStateResponse;
  }, [fetchWithAuth, targetKey, targetLabel, targetType]);

  const fetchModalPayloadWithFallback = useCallback(async () => {
    try {
      const payload = await loadModalState(includeRelated);
      return {
        fallbackMessage: null as string | null,
        payload,
        relatedFallback: false,
      };
    } catch (modalError) {
      const message = modalError instanceof Error ? modalError.message : "";
      if (!includeRelated || !isSchemaVariantError(message)) {
        throw modalError;
      }
      const payload = await loadModalState(false);
      return {
        fallbackMessage: "Related logo pairing temporarily unavailable; discovery sources are still usable.",
        payload,
        relatedFallback: true,
      };
    }
  }, [includeRelated, loadModalState]);

  const discoverBySource = useCallback(async (sourceProvider: string, offset: number, limit: number, queryValues: string[]) => {
    const response = await fetchWithAuth("/api/admin/trr-api/brands/logos/options/discover", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        target_type: targetType,
        target_key: targetKey,
        target_label: targetLabel,
        logo_role: "wordmark",
        source_provider: sourceProvider,
        query_override: queryValues[0] || undefined,
        query_overrides: queryValues.length > 0 ? queryValues : undefined,
        offset,
        limit,
        include_related: includeRelated,
      }),
    });
    if (!response.ok) {
      throw new Error(normalizeLogoOptionsErrorMessage(await parseErrorPayload(response)));
    }
    return (await response.json()) as DiscoverResponse;
  }, [fetchWithAuth, includeRelated, targetKey, targetLabel, targetType]);

  const refreshSource = useCallback(async ({
    append = false,
    sourceProvider,
    sourceSnapshot,
    sessionId = modalSessionRef.current,
  }: {
    append?: boolean;
    sourceProvider: string;
    sourceSnapshot?: SourceSummary;
    sessionId?: number;
  }) => {
    const source = sourceSnapshot ?? sourcesRef.current.find((row) => row.source_provider === sourceProvider);
    if (!source?.refreshable) return;
    const requestId = (sourceRefreshRequestIdRef.current[sourceProvider] ?? 0) + 1;
    sourceRefreshRequestIdRef.current[sourceProvider] = requestId;

    const offset = append ? discoverOffsetBySourceRef.current[sourceProvider] ?? 0 : 0;
    setSourceStatusBySource((previous) => ({ ...previous, [sourceProvider]: "loading" }));
    setSourceErrorBySource((previous) => ({ ...previous, [sourceProvider]: null }));

    try {
      const payload = await discoverBySource(sourceProvider, offset, SOURCE_PREFETCH_SIZE, getSourceQueryValues(source));
      if (
        modalSessionRef.current !== sessionId
        || sourceRefreshRequestIdRef.current[sourceProvider] !== requestId
      ) {
        return;
      }
      const nextCandidates = Array.isArray(payload.candidates) ? payload.candidates : [];
      const allowedIds = new Set(
        append
          ? [
              ...((discoveredOptionsBySourceRef.current[sourceProvider] ?? []).map((candidate) => candidate.id)),
              ...nextCandidates.map((candidate) => candidate.id),
            ]
          : nextCandidates.map((candidate) => candidate.id),
      );
      setDiscoveredOptionsBySource((previous) => {
        if (!append) return { ...previous, [sourceProvider]: nextCandidates };
        const existing = previous[sourceProvider] ?? [];
        const existingIds = new Set(existing.map((candidate) => candidate.id));
        const merged = [...existing];
        for (const candidate of nextCandidates) {
          if (existingIds.has(candidate.id)) continue;
          existingIds.add(candidate.id);
          merged.push(candidate);
        }
        return { ...previous, [sourceProvider]: merged };
      });
      setSelectedOptionIdsBySource((previous) => {
        if (!Object.prototype.hasOwnProperty.call(previous, sourceProvider)) return previous;
        return {
          ...previous,
          [sourceProvider]: (previous[sourceProvider] ?? []).filter((optionId) => allowedIds.has(optionId)),
        };
      });
      setDiscoveredCountBySource((previous) => ({ ...previous, [sourceProvider]: Number(payload.total_count ?? 0) }));
      setDiscoverOffsetBySource((previous) => ({ ...previous, [sourceProvider]: Number(payload.next_offset ?? 0) }));
      setDiscoverHasMoreBySource((previous) => ({ ...previous, [sourceProvider]: Boolean(payload.has_more) }));
      setSourceStatusBySource((previous) => ({ ...previous, [sourceProvider]: "ready" }));
      if (!append) resetResultsScroll();
    } catch (sourceError) {
      if (
        modalSessionRef.current !== sessionId
        || sourceRefreshRequestIdRef.current[sourceProvider] !== requestId
      ) {
        return;
      }
      setSourceStatusBySource((previous) => ({ ...previous, [sourceProvider]: "error" }));
      setSourceErrorBySource((previous) => ({
        ...previous,
        [sourceProvider]: normalizeLogoOptionsErrorMessage(
          sourceError instanceof Error ? sourceError.message : "Failed to refresh source",
        ),
      }));
    }
  }, [discoverBySource, resetResultsScroll]);

  const prefetchSourceCandidates = useCallback(async (sourceRows: SourceSummary[], sessionId = modalSessionRef.current) => {
    const refreshable = sourceRows.filter((source) => source.refreshable);
    await runWithConcurrency(refreshable, SOURCE_PREFETCH_CONCURRENCY, async (source) => {
      await refreshSource({ sourceProvider: source.source_provider, sourceSnapshot: source, sessionId });
    });
  }, [refreshSource]);

  const loadInitial = useCallback(async () => {
    const sessionId = modalSessionRef.current + 1;
    modalSessionRef.current = sessionId;
    const requestId = modalLoadRequestIdRef.current + 1;
    modalLoadRequestIdRef.current = requestId;
    sourceRefreshRequestIdRef.current = {};
    suggestionRequestIdRef.current = {};
    setLoading(true);
    setError(null);
    setRelatedFallbackActive(false);
    setManualImportError(null);
    setManualImageUrl("");
    setManualImportOpen(false);
    setSlugPanelOpen(false);
    setAddingSharedSlug(false);
    setNewSharedSlugDraft("");
    setAddingQueryBySource({});
    setNewQueryDraftBySource({});
    setDiscoveredOptionsBySource({});
    setSelectedOptionIdsBySource({});
    setDiscoveredCountBySource({});
    setDiscoverOffsetBySource({});
    setDiscoverHasMoreBySource({});
    setSourceErrorBySource({});
    setSourceSuggestionsBySource({});
    setSourceSuggestionsLoadingBySource({});
    setSourceSuggestionsErrorBySource({});
    setHasPersistedChanges(false);
    try {
      const {
        fallbackMessage,
        payload,
        relatedFallback,
      } = await fetchModalPayloadWithFallback();
      if (
        modalSessionRef.current !== sessionId
        || modalLoadRequestIdRef.current !== requestId
      ) {
        return;
      }
      setRelatedFallbackActive(relatedFallback);
      setError(fallbackMessage);
      hydrateFromModalPayload(payload);
      const sourceRows = Array.isArray(payload.sources) ? payload.sources : [];
      void prefetchSourceCandidates(sourceRows, sessionId);
    } catch (loadError) {
      if (
        modalSessionRef.current !== sessionId
        || modalLoadRequestIdRef.current !== requestId
      ) {
        return;
      }
      setError(normalizeLogoOptionsErrorMessage(loadError instanceof Error ? loadError.message : "Failed to load logo options"));
    } finally {
      if (
        modalSessionRef.current === sessionId
        && modalLoadRequestIdRef.current === requestId
      ) {
        setLoading(false);
      }
    }
  }, [fetchModalPayloadWithFallback, hydrateFromModalPayload, prefetchSourceCandidates]);

  useEffect(() => {
    if (!isOpen) return;
    void loadInitial();
  }, [isOpen, loadInitial]);

  const manualOptions = useMemo(() => discoveredOptionsBySource[MANUAL_SOURCE_PROVIDER] ?? [], [discoveredOptionsBySource]);

  const savedSourceSummary = useMemo<SourceSummary | null>(() => {
    if (savedAssets.length === 0) return null;
    return {
      source_provider: SAVED_SOURCE_PROVIDER,
      total_count: savedAssets.length,
      has_more: false,
      editable: false,
      refreshable: false,
      query_kind: "readonly",
      default_query_value: "saved library assets",
      effective_query_value: "saved library assets",
      query_links: ["shared saved asset library"],
    };
  }, [savedAssets.length]);

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
    };
  }, [manualOptions.length]);

  const sourceLookup = useMemo(() => {
    const map = new Map<string, SourceSummary>(sources.map((source) => [source.source_provider, source]));
    if (savedSourceSummary) map.set(savedSourceSummary.source_provider, savedSourceSummary);
    if (manualSourceSummary) map.set(manualSourceSummary.source_provider, manualSourceSummary);
    return map;
  }, [manualSourceSummary, savedSourceSummary, sources]);

  const optionsById = useMemo(() => {
    const map = new Map<string, SavedLogoAsset | DiscoverCandidate>();
    for (const asset of savedAssets) map.set(asset.id, asset);
    for (const sourceOptions of Object.values(discoveredOptionsBySource)) {
      for (const option of sourceOptions) map.set(option.id, option);
    }
    return map;
  }, [discoveredOptionsBySource, savedAssets]);

  const sourceTabs = useMemo(() => {
    const tabs = [...sources];
    const out: SourceSummary[] = [];
    if (savedSourceSummary) out.push(savedSourceSummary);
    out.push(...tabs);
    if (manualSourceSummary) out.push(manualSourceSummary);
    return out;
  }, [manualSourceSummary, savedSourceSummary, sources]);
  const hasSharedSlugSources = useMemo(
    () => sources.some((source) => source.editable && SHARED_SLUG_SOURCE_KINDS.includes(source.query_kind ?? "readonly")),
    [sources],
  );

  useEffect(() => {
    if (sourceTabs.length === 0) {
      if (activeSource !== null) setActiveSource(null);
      return;
    }
    if (!activeSource || !sourceTabs.some((source) => source.source_provider === activeSource)) {
      setActiveSource(sourceTabs[0]?.source_provider ?? null);
    }
  }, [activeSource, sourceTabs]);

  const activeSourceRow = activeSource ? sourceLookup.get(activeSource) ?? null : null;
  const activeSourceStatus = activeSource ? sourceStatusBySource[activeSource] : undefined;
  const activeSourceError = activeSource ? sourceErrorBySource[activeSource] : undefined;
  const activeSourceQueryValues = getSourceQueryValues(activeSourceRow);
  const activeSourceSuggestions = activeSource ? sourceSuggestionsBySource[activeSource] ?? [] : [];
  const activeSourceSuggestionsLoading = activeSource ? Boolean(sourceSuggestionsLoadingBySource[activeSource]) : false;
  const activeSourceSuggestionsError = activeSource ? sourceSuggestionsErrorBySource[activeSource] : null;
  const activeSelectionIds = useMemo(() => {
    if (!activeSource || activeSource === SAVED_SOURCE_PROVIDER) return [];
    return (selectedOptionIdsBySource[activeSource] ?? []).filter((optionId) => optionsById.has(optionId));
  }, [activeSource, optionsById, selectedOptionIdsBySource]);
  const allOptions = useMemo(() => {
    if (!activeSource) return [];
    if (activeSource === SAVED_SOURCE_PROVIDER) return savedAssets;
    if (activeSource === MANUAL_SOURCE_PROVIDER) return manualOptions;
    return discoveredOptionsBySource[activeSource] ?? [];
  }, [activeSource, discoveredOptionsBySource, manualOptions, savedAssets]);
  const updateSourceSummary = useCallback((sourceProvider: string, updater: (source: SourceSummary) => SourceSummary) => {
    setSources((previous) => previous.map((source) => (source.source_provider === sourceProvider ? updater(source) : source)));
  }, []);

  const notifySaved = useCallback(() => {
    void Promise.resolve(onSaved()).catch(() => undefined);
  }, [onSaved]);

  const saveSourceQueries = useCallback(async (sourceProvider: string, nextValues: string[]) => {
    if (saving || loading) return;
    const previousSource = sourcesRef.current.find((source) => source.source_provider === sourceProvider) ?? null;
    const normalizedValues = dedupeNormalizedValues(nextValues);
    setSourceStatusBySource((previous) => ({ ...previous, [sourceProvider]: "saving" }));
    setSourceErrorBySource((previous) => ({ ...previous, [sourceProvider]: null }));
    if (previousSource) {
      updateSourceSummary(sourceProvider, (source) => ({
        ...source,
        effective_query_value: normalizedValues[0] ?? null,
        query_values: normalizedValues,
      }));
    }
    try {
      const responses = await Promise.all(
        SHARED_SOURCE_QUERY_ROLES.map(async (role) => {
          const response = await fetchWithAuth("/api/admin/trr-api/brands/logos/options/source-query", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              target_type: targetType,
              target_key: targetKey,
              target_label: targetLabel,
              logo_role: role,
              source_provider: sourceProvider,
              query_values: normalizedValues,
            }),
          });
          if (!response.ok) {
            throw new Error(normalizeLogoOptionsErrorMessage(await parseErrorPayload(response)));
          }
          return (await response.json()) as SourceQuerySaveResponse;
        }),
      );
      const payload = responses[0];
      if (payload.source) {
        updateSourceSummary(sourceProvider, (source) => ({
          ...source,
          ...payload.source,
          total_count: source.total_count,
        }));
      }
      await refreshSource({
        sourceProvider,
        sourceSnapshot: payload.source
          ? {
              ...payload.source,
              source_provider: payload.source.source_provider || sourceProvider,
              total_count: sourcesRef.current.find((source) => source.source_provider === sourceProvider)?.total_count ?? 0,
              has_more: payload.source.has_more ?? false,
            }
          : undefined,
      });
      setAddingQueryBySource((previous) => ({ ...previous, [sourceProvider]: false }));
      setNewQueryDraftBySource((previous) => ({ ...previous, [sourceProvider]: "" }));
      setSourceStatusBySource((previous) => ({ ...previous, [sourceProvider]: "ready" }));
      setHasPersistedChanges(true);
      if (sourceProvider === "logos_fandom") {
        setSourceSuggestionsBySource((previous) => ({ ...previous, [sourceProvider]: [] }));
      }
    } catch (saveError) {
      if (previousSource) {
        updateSourceSummary(sourceProvider, () => previousSource);
      }
      setSourceStatusBySource((previous) => ({ ...previous, [sourceProvider]: "error" }));
      setSourceErrorBySource((previous) => ({
        ...previous,
        [sourceProvider]: normalizeLogoOptionsErrorMessage(
          saveError instanceof Error ? saveError.message : "Failed to save source queries",
        ),
      }));
    }
  }, [fetchWithAuth, loading, refreshSource, saving, targetKey, targetLabel, targetType, updateSourceSummary]);

  const loadSourceSuggestions = useCallback(async (
    sourceProvider: string,
    { force = false, sessionId = modalSessionRef.current }: { force?: boolean; sessionId?: number } = {},
  ) => {
    if (sourceProvider !== "logos_fandom") return;
    if (!force && sourceSuggestionsBySource[sourceProvider]) return;
    const requestId = (suggestionRequestIdRef.current[sourceProvider] ?? 0) + 1;
    suggestionRequestIdRef.current[sourceProvider] = requestId;
    setSourceSuggestionsLoadingBySource((previous) => ({ ...previous, [sourceProvider]: true }));
    setSourceSuggestionsErrorBySource((previous) => ({ ...previous, [sourceProvider]: null }));
    try {
      const params = new URLSearchParams({
        target_type: targetType,
        target_key: targetKey,
        target_label: targetLabel,
        logo_role: "wordmark",
        source_provider: sourceProvider,
      });
      const response = await fetchWithAuth(`/api/admin/trr-api/brands/logos/options/source-suggestions?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(normalizeLogoOptionsErrorMessage(await parseErrorPayload(response)));
      }
      const payload = (await response.json()) as SourceSuggestionResponse;
      if (
        modalSessionRef.current !== sessionId
        || suggestionRequestIdRef.current[sourceProvider] !== requestId
      ) {
        return;
      }
      setSourceSuggestionsBySource((previous) => ({
        ...previous,
        [sourceProvider]: Array.isArray(payload.suggestions) ? payload.suggestions : [],
      }));
    } catch (suggestionError) {
      if (
        modalSessionRef.current !== sessionId
        || suggestionRequestIdRef.current[sourceProvider] !== requestId
      ) {
        return;
      }
      setSourceSuggestionsErrorBySource((previous) => ({
        ...previous,
        [sourceProvider]: normalizeLogoOptionsErrorMessage(
          suggestionError instanceof Error ? suggestionError.message : "Failed to load source suggestions",
        ),
      }));
    } finally {
      if (
        modalSessionRef.current === sessionId
        && suggestionRequestIdRef.current[sourceProvider] === requestId
      ) {
        setSourceSuggestionsLoadingBySource((previous) => ({ ...previous, [sourceProvider]: false }));
      }
    }
  }, [fetchWithAuth, sourceSuggestionsBySource, targetKey, targetLabel, targetType]);

  useEffect(() => {
    if (!isOpen || activeSource !== "logos_fandom") return;
    void loadSourceSuggestions(activeSource);
  }, [activeSource, isOpen, loadSourceSuggestions]);

  const applySharedSlugs = useCallback(async (nextSlugs: string[]) => {
    const normalizedSlugs = dedupeNormalizedValues(nextSlugs.map((value) => normalizeSharedSlug(value)).filter(Boolean));
    setApplyingSlugs(true);
    setError(null);
    try {
      const eligibleSources = sourcesRef.current.filter(
        (source) => source.editable && SHARED_SLUG_SOURCE_KINDS.includes(source.query_kind ?? "readonly"),
      );
      for (const source of eligibleSources) {
        const nextQueryValues = buildQueriesFromSharedSlugs(source, normalizedSlugs);
        if (areStringListsEqual(getSourceQueryValues(source), nextQueryValues)) continue;
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
  }, [saveSourceQueries]);

  const onAddManualImageUrl = useCallback(() => {
    if (saving || loading) return;
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
      id: manualCandidateId(sourceUrl),
      source_url: sourceUrl,
      source_provider: MANUAL_SOURCE_PROVIDER,
      discovered_from: sourceUrl,
      option_kind: "candidate",
      file_type: inferFileTypeFromUrl(sourceUrl),
      content_type: null,
      width: null,
      height: null,
      aspect_ratio: null,
      detected_logo_role: "wordmark",
    };
    const alreadyExists = manualOptions.some((option) => option.source_url === sourceUrl);
    setManualImportError(null);
    setDiscoveredOptionsBySource((previous) => {
      const current = previous[MANUAL_SOURCE_PROVIDER] ?? [];
      if (current.some((option) => option.source_url === sourceUrl)) return previous;
      return { ...previous, [MANUAL_SOURCE_PROVIDER]: [...current, candidate] };
    });
    if (!alreadyExists) {
      setDiscoveredCountBySource((previous) => ({ ...previous, [MANUAL_SOURCE_PROVIDER]: (previous[MANUAL_SOURCE_PROVIDER] ?? 0) + 1 }));
    }
    setActiveSource(MANUAL_SOURCE_PROVIDER);
    setSelectedOptionIdsBySource((previous) => ({
      ...previous,
      [MANUAL_SOURCE_PROVIDER]: Array.from(new Set([...(previous[MANUAL_SOURCE_PROVIDER] ?? []), candidate.id])),
    }));
    setManualImageUrl("");
  }, [loading, manualImageUrl, manualOptions, saving]);

  const toggleNonSavedSelection = useCallback((sourceProvider: string, optionId: string) => {
    if (saving) return;
    setSelectedOptionIdsBySource((previous) => {
      const existing = previous[sourceProvider] ?? [];
      const isSelected = existing.includes(optionId);
      return {
        ...previous,
        [sourceProvider]: isSelected ? existing.filter((candidateId) => candidateId !== optionId) : [...existing, optionId],
      };
    });
  }, [saving]);

  const refreshModalAfterMutation = useCallback(async (preferredActiveSource: string | null) => {
    const requestId = mutationRefreshRequestIdRef.current + 1;
    mutationRefreshRequestIdRef.current = requestId;
    const sessionId = modalSessionRef.current;
    const {
      fallbackMessage,
      payload,
      relatedFallback,
    } = await fetchModalPayloadWithFallback();
    if (
      mutationRefreshRequestIdRef.current !== requestId
      || modalSessionRef.current !== sessionId
    ) {
      return false;
    }
    setRelatedFallbackActive(relatedFallback);
    setError(fallbackMessage);
    hydrateFromModalPayload(payload, { preferredActiveSource });
    const sourceRows = Array.isArray(payload.sources) ? payload.sources : [];
    void prefetchSourceCandidates(sourceRows, sessionId);
    return true;
  }, [fetchModalPayloadWithFallback, hydrateFromModalPayload, prefetchSourceCandidates]);

  const onSaveSelected = useCallback(async () => {
    if (saving) return;
    if (!activeSource || activeSource === SAVED_SOURCE_PROVIDER || activeSelectionIds.length === 0) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const selectedOptions = activeSelectionIds
        .map((optionId) => optionsById.get(optionId))
        .filter((option): option is SavedLogoAsset | DiscoverCandidate => Boolean(option));
      if (selectedOptions.length === 0) {
        throw new Error("Selected options are no longer available.");
      }
      for (const [index, option] of selectedOptions.entries()) {
        const setFeatured = index === selectedOptions.length - 1;
        const body: Record<string, unknown> = {
          target_type: targetType,
          target_key: targetKey,
          target_label: targetLabel,
          logo_role: getOptionPreferredRole(option),
          set_featured: setFeatured,
        };
        if ((option.option_kind || "stored") === "candidate") {
          body.candidate = {
            source_url: option.source_url,
            source_provider: option.source_provider || null,
            discovered_from: option.discovered_from || null,
          };
        } else {
          body.asset_id = option.id;
        }
        const response = await fetchWithAuth("/api/admin/trr-api/brands/logos/options/select", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          throw new Error(normalizeLogoOptionsErrorMessage(await parseErrorPayload(response)));
        }
      }
      await refreshModalAfterMutation(SAVED_SOURCE_PROVIDER);
      setHasPersistedChanges(true);
      notifySaved();
    } catch (saveError) {
      setError(
        normalizeLogoOptionsErrorMessage(
          saveError instanceof Error ? saveError.message : "Failed to save selected logo options",
        ),
      );
    } finally {
      setSaving(false);
    }
  }, [activeSelectionIds, activeSource, fetchWithAuth, notifySaved, optionsById, refreshModalAfterMutation, saving, targetKey, targetLabel, targetType]);

  const activeSourceDisplayCount = activeSource && Object.prototype.hasOwnProperty.call(discoveredCountBySource, activeSource)
    ? discoveredCountBySource[activeSource]
    : activeSourceRow?.total_count ?? 0;
  const activeSourceBusy = activeSource ? sourceStatusBySource[activeSource] === "saving" || sourceStatusBySource[activeSource] === "loading" : false;

  useEffect(() => {
    if (!activeSource) return;
    resetResultsScroll();
  }, [activeSource, resetResultsScroll]);

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Brand Logos • ${targetLabel}`}
      panelClassName="max-h-[90vh] max-w-5xl overflow-y-auto p-0"
    >
      <div ref={resultsScrollRef} data-testid="brand-logo-modal-scroll-root" className="flex min-h-0 flex-col">
          <div className="border-b border-zinc-200 bg-white px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Logo Library</p>
                <p className="text-sm text-zinc-600">Discover candidates by source, review the saved library, and persist only the options you select.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {hasSharedSlugSources ? (
                  <Button variant={slugPanelOpen ? "secondary" : "outline"} size="sm" onClick={() => setSlugPanelOpen((previous) => !previous)} disabled={saving || loading || applyingSlugs}>
                    {slugPanelOpen ? "Hide Slugs" : "Slugs"}
                  </Button>
                ) : null}
                <Button variant={manualImportOpen ? "secondary" : "outline"} size="sm" onClick={() => setManualImportOpen((previous) => !previous)} disabled={saving || loading}>
                  {manualImportOpen ? "Hide Manual Import" : "Add Manual Import"}
                </Button>
              </div>
            </div>

            {slugPanelOpen && hasSharedSlugSources ? (
              <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Shared Slugs</p>
                    <p className="text-sm text-zinc-600">Editing a shared slug reruns every compatible source with the full shared slug list.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setAddingSharedSlug(true)} disabled={applyingSlugs}>
                    Add Slug
                  </Button>
                </div>
                <div className="mt-3 space-y-3">
                  {sharedSlugs.length === 0 ? <p className="text-sm text-zinc-500">No shared slugs yet.</p> : null}
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
                        <EditableSubmit asChild><Button size="sm">Save</Button></EditableSubmit>
                        <EditableCancel asChild><Button variant="outline" size="sm">Cancel</Button></EditableCancel>
                      </EditableToolbar>
                      <div className="pt-1">
                        <EditableTrigger asChild><Button variant="ghost" size="sm" className="w-fit">Edit slug</Button></EditableTrigger>
                      </div>
                    </Editable>
                  ))}
                  {addingSharedSlug ? (
                    <div className="space-y-2 rounded-xl border border-dashed border-zinc-300 bg-white p-3">
                      <label className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500" htmlFor="new-shared-slug">
                        New Slug
                      </label>
                      <input
                        id="new-shared-slug"
                        aria-label="New Slug"
                        type="text"
                        value={newSharedSlugDraft}
                        onChange={(event) => setNewSharedSlugDraft(event.target.value)}
                        placeholder="Enter shared slug"
                        className="min-h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" disabled={applyingSlugs || saving || loading} onClick={() => void applySharedSlugs([...sharedSlugs, newSharedSlugDraft])}>Add</Button>
                        <Button variant="outline" size="sm" onClick={() => {
                          setAddingSharedSlug(false);
                          setNewSharedSlugDraft("");
                        }} disabled={applyingSlugs || saving || loading}>Cancel</Button>
                      </div>
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
                      onChange={(event) => setManualImageUrl(event.target.value)}
                      placeholder="https://example.com/logo.svg"
                      className="min-h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
                    />
                    {manualImportError ? <p className="text-xs text-red-700">{manualImportError}</p> : null}
                  </div>
                  <Button variant="outline" onClick={onAddManualImageUrl} disabled={saving || loading}>Import Image URL</Button>
                </div>
              </div>
            ) : null}

            {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

            <div className="mt-4 sticky top-0 z-10 -mx-4 overflow-x-auto border-y border-zinc-200 bg-white px-4 py-3 shadow-[0_1px_0_rgba(0,0,0,0.03)]">
              <div className="flex min-w-max flex-wrap gap-2 pr-1">
                {sourceTabs.map((source) => {
                  const hasLiveCount = Object.prototype.hasOwnProperty.call(discoveredCountBySource, source.source_provider);
                  const displayCount = source.source_provider === SAVED_SOURCE_PROVIDER
                    ? savedAssets.length
                    : source.source_provider === MANUAL_SOURCE_PROVIDER
                      ? manualOptions.length
                      : hasLiveCount
                        ? discoveredCountBySource[source.source_provider]
                        : source.total_count;
                  return (
                    <button
                      key={source.source_provider}
                      type="button"
                      onClick={() => setActiveSource(source.source_provider)}
                      className={joinClassNames(
                        "rounded-full border px-3 py-1 text-xs font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2",
                        activeSource === source.source_provider
                          ? "border-cyan-600 bg-cyan-600 text-white"
                          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50",
                      )}
                    >
                      {source.source_provider} ({displayCount})
                    </button>
                  );
                })}
              </div>
            </div>

            {activeSourceRow ? (
              <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2 lg:max-w-[220px]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Active Source</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-zinc-900 bg-zinc-900 px-3 py-1 text-xs font-semibold text-white">
                        {activeSourceRow.source_provider}
                      </span>
                      {relatedFallbackActive ? (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                          Related fallback active
                        </span>
                      ) : null}
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
                            onClick={() => setAddingQueryBySource((previous) => ({ ...previous, [activeSourceRow.source_provider]: true }))}
                            disabled={saving || loading || activeSourceStatus === "saving"}
                          >
                            Add Query
                          </Button>
                        </div>
                        {activeSourceQueryValues.map((queryValue, index) => (
                          <Editable
                            key={`${activeSourceRow.source_provider}:query:${index}`}
                            value={queryValue}
                            placeholder={QUERY_PLACEHOLDERS[activeSourceRow.query_kind ?? "search_term"]}
                            onSubmit={(nextValue) => {
                              if (saving || loading || activeSourceStatus === "saving") return Promise.resolve();
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
                              <EditableSubmit asChild><Button size="sm" disabled={saving || loading || activeSourceStatus === "saving"}>Save</Button></EditableSubmit>
                              <EditableCancel asChild><Button variant="outline" size="sm" disabled={saving || loading || activeSourceStatus === "saving"}>Cancel</Button></EditableCancel>
                            </EditableToolbar>
                            <div className="pt-1">
                              <EditableTrigger asChild><Button variant="ghost" size="sm" className="w-fit" disabled={saving || loading || activeSourceStatus === "saving"}>Edit query</Button></EditableTrigger>
                            </div>
                          </Editable>
                        ))}
                        {addingQueryBySource[activeSourceRow.source_provider] ? (
                          <div className="space-y-2 rounded-xl border border-dashed border-zinc-300 bg-white p-3">
                            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500" htmlFor={`new-query-${activeSourceRow.source_provider}`}>
                              New Query
                            </label>
                            <input
                              id={`new-query-${activeSourceRow.source_provider}`}
                              aria-label="New Query"
                              type="text"
                              value={newQueryDraftBySource[activeSourceRow.source_provider] ?? ""}
                              onChange={(event) => setNewQueryDraftBySource((previous) => ({ ...previous, [activeSourceRow.source_provider]: event.target.value }))}
                              placeholder={QUERY_PLACEHOLDERS[activeSourceRow.query_kind ?? "search_term"]}
                              className="min-h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
                            />
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                disabled={saving || loading || activeSourceStatus === "saving"}
                                onClick={() => void saveSourceQueries(activeSourceRow.source_provider, [...activeSourceQueryValues, newQueryDraftBySource[activeSourceRow.source_provider] ?? ""])}
                              >
                                Add
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={saving || loading || activeSourceStatus === "saving"}
                                onClick={() => {
                                  setAddingQueryBySource((previous) => ({ ...previous, [activeSourceRow.source_provider]: false }));
                                  setNewQueryDraftBySource((previous) => ({ ...previous, [activeSourceRow.source_provider]: "" }));
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : null}
                        {renderSourceLinks(activeSourceRow.query_links)}
                        {activeSourceRow.source_provider === "logos_fandom" ? (
                          <div className="space-y-3 rounded-xl border border-dashed border-zinc-300 bg-white p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="space-y-1">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Editable Suggestions</p>
                                <p className="text-sm text-zinc-600">Add linked brand and program pages into the saved query list.</p>
                              </div>
                              {activeSourceSuggestions.length > 0 ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={saving || loading || activeSourceStatus === "saving"}
                                  onClick={() => void saveSourceQueries(
                                    activeSourceRow.source_provider,
                                    dedupeNormalizedValues([
                                      ...activeSourceQueryValues,
                                      ...activeSourceSuggestions.map((suggestion) => suggestion.query_value),
                                    ]),
                                  )}
                                >
                                  Add All Suggestions
                                </Button>
                              ) : null}
                            </div>
                            {activeSourceSuggestionsLoading ? <p className="text-sm text-zinc-500">Loading suggestions...</p> : null}
                            {activeSourceSuggestionsError ? <p className="text-sm text-red-700">{activeSourceSuggestionsError}</p> : null}
                            {!activeSourceSuggestionsLoading && !activeSourceSuggestionsError && activeSourceSuggestions.length === 0 ? (
                              <p className="text-sm text-zinc-500">No extra suggestions available.</p>
                            ) : null}
                            {activeSourceSuggestions.map((suggestion) => (
                              <div key={`${suggestion.query_value}:${suggestion.query_link}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                                <div className="min-w-0 space-y-1">
                                  <p className="truncate text-sm font-semibold text-zinc-900">{suggestion.query_value}</p>
                                  <p className="truncate text-xs text-zinc-500">{suggestion.discovered_from || suggestion.reason || suggestion.query_link}</p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={saving || loading || activeSourceStatus === "saving"}
                                  onClick={() => void saveSourceQueries(
                                    activeSourceRow.source_provider,
                                    dedupeNormalizedValues([...activeSourceQueryValues, suggestion.query_value]),
                                  )}
                                >
                                  Add
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">Source Queries</p>
                        <div className="space-y-2">
                          {activeSourceQueryValues.map((queryValue, index) => (
                            <div key={`${activeSourceRow.source_provider}:readonly:${queryValue}:${index}`} className="min-h-10 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900">
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
                        onClick={() => void refreshSource({ sourceProvider: activeSourceRow.source_provider, sourceSnapshot: activeSourceRow })}
                        disabled={saving || activeSourceStatus === "loading" || activeSourceStatus === "saving"}
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
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-4 py-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">Logo Results</p>
                <p className="text-sm text-zinc-600">
                  {loading
                    ? "Loading brand logo picker..."
                    : activeSource
                      ? `${allOptions.length} option${allOptions.length === 1 ? "" : "s"} for ${activeSource} (${activeSourceDisplayCount} total)`
                      : "Select a source."}
                </p>
              </div>
              {activeSourceRow?.refreshable && discoverHasMoreBySource[activeSourceRow.source_provider] ? (
                <Button
                  variant="outline"
                  onClick={() => void refreshSource({ append: true, sourceProvider: activeSourceRow.source_provider, sourceSnapshot: activeSourceRow })}
                  disabled={saving || activeSourceStatus === "loading" || activeSourceStatus === "saving"}
                >
                  Load More
                </Button>
              ) : null}
            </div>

            <div data-testid="brand-logo-results-panel" className="rounded-2xl border border-zinc-200 bg-white p-3">
              {!loading && activeSource && allOptions.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  {getEmptyStateMessage({
                    activeSource,
                    activeSourceError,
                    activeSourceRow,
                    activeSourceStatus,
                    relatedFallbackActive,
                  })}
                </p>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {allOptions.map((option) => {
                  const isSaved = activeSource === SAVED_SOURCE_PROVIDER;
                  const isSelected = !isSaved && activeSelectionIds.includes(option.id);
                  return (
                    <LogoCard
                      key={option.id}
                      option={option}
                      isSaved={isSaved}
                      selected={isSelected}
                      targetLabel={targetLabel}
                      disabled={saving || loading || activeSourceBusy}
                      onClick={
                        isSaved || !activeSource
                          ? undefined
                          : () => toggleNonSavedSelection(activeSource, option.id)
                      }
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 z-10 flex shrink-0 items-center justify-between gap-3 border-t border-zinc-200 bg-white px-4 py-3">
            <p className="text-xs text-zinc-500">
              {activeSource === SAVED_SOURCE_PROVIDER
                ? "Saved assets stay in the library until you explicitly choose new candidates and save them."
                : "Batch save selected assets into the shared saved library."}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose} disabled={saving}>{hasPersistedChanges ? "Save" : "Close"}</Button>
              {activeSource !== SAVED_SOURCE_PROVIDER ? (
                <Button onClick={() => void onSaveSelected()} disabled={saving || activeSelectionIds.length === 0}>
                  {saving ? "Saving..." : `Save Selected (${activeSelectionIds.length})`}
                </Button>
              ) : null}
            </div>
          </div>
      </div>
    </AdminModal>
  );
}
