"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import BrandsTabs from "@/components/admin/BrandsTabs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import { buildBrandsPageBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { normalizeEntityKey, toEntitySlug } from "@/lib/admin/networks-streaming-entity";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

type NetworksStreamingType = "network" | "streaming" | "production";

type CompletionStatus = "resolved" | "manual_required" | "failed";

interface NetworksStreamingRow {
  type: NetworksStreamingType;
  name: string;
  available_show_count: number;
  added_show_count: number;
  hosted_logo_url: string | null;
  hosted_logo_black_url: string | null;
  hosted_logo_white_url: string | null;
  wikidata_id: string | null;
  wikipedia_url: string | null;
  tmdb_entity_id: string | null;
  homepage_url: string | null;
  resolution_status: CompletionStatus | null;
  resolution_reason: string | null;
  last_attempt_at: string | null;
  has_logo: boolean;
  has_bw_variants: boolean;
  has_links: boolean;
}

interface NetworksStreamingSummary {
  totals: {
    total_available_shows: number;
    total_added_shows: number;
  };
  rows: NetworksStreamingRow[];
  generated_at: string;
}

interface MissingColumn {
  table: string;
  column: string;
}

interface UnresolvedLogoItem {
  type: NetworksStreamingType;
  id: string;
  name: string;
  reason: string;
}

interface SyncResumeCursor {
  entity_type: NetworksStreamingType;
  entity_key: string;
}

interface NetworksStreamingSyncResult {
  run_id: string;
  status: "completed" | "stopped" | "failed";
  resume_cursor: SyncResumeCursor | null;
  entities_synced: number;
  providers_synced: number;
  links_enriched: number;
  logos_mirrored: number;
  variants_black_mirrored: number;
  variants_white_mirrored: number;
  logo_assets_discovered: number;
  logo_assets_mirrored: number;
  logo_assets_skipped: number;
  logo_assets_failed: number;
  completion_total: number;
  completion_resolved: number;
  completion_unresolved: number;
  completion_unresolved_total: number;
  completion_unresolved_network: number;
  completion_unresolved_streaming: number;
  completion_unresolved_production: number;
  production_missing_logos: number;
  production_missing_bw_variants: number;
  completion_percent: number;
  completion_gate_passed: boolean;
  missing_columns: MissingColumn[];
  unresolved_logos_count: number;
  unresolved_logos_truncated: boolean;
  unresolved_logos: UnresolvedLogoItem[];
  failures: number;
}

interface OverrideRow {
  id: string;
  entity_type: NetworksStreamingType;
  entity_key: string;
  display_name_override: string | null;
  wikidata_id_override: string | null;
  wikipedia_url_override: string | null;
  logo_source_urls_override: unknown;
  source_priority_override: string[];
  aliases_override: string[];
  notes: string | null;
  is_active: boolean;
}

interface OverrideDraft {
  wikidata_id_override: string;
  wikipedia_url_override: string;
  logo_source_url: string;
  notes: string;
}

type TypeFilter = "all" | NetworksStreamingType;

interface ErrorPayload {
  code: string | null;
  message: string;
}

const parseErrorPayload = async (response: Response): Promise<ErrorPayload> => {
  const fallback = `Request failed (${response.status})`;
  try {
    const payload = (await response.json()) as {
      error?: string;
      detail?: string;
      message?: string;
      error_code?: string;
    };
    const code = typeof payload.error_code === "string" ? payload.error_code : null;
    if (typeof payload.error === "string" && typeof payload.detail === "string") {
      return { code, message: `${payload.error}: ${payload.detail}` };
    }
    if (typeof payload.error === "string") return { code, message: payload.error };
    if (typeof payload.message === "string") return { code, message: payload.message };
    if (typeof payload.detail === "string") return { code, message: payload.detail };
    return { code, message: fallback };
  } catch {
    return { code: null, message: fallback };
  }
};

const csvEscape = (value: string): string => {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
};

function getExternalIds(row: NetworksStreamingRow) {
  const tmdbId = row.tmdb_entity_id;
  let tmdbUrl: string | null = null;
  if (tmdbId) {
    if (row.type === "network") tmdbUrl = `https://www.themoviedb.org/network/${tmdbId}`;
    else if (row.type === "streaming") tmdbUrl = `https://www.themoviedb.org/provider/${tmdbId}`;
    else if (row.type === "production") tmdbUrl = `https://www.themoviedb.org/company/${tmdbId}`;
  }

  let imdbId: string | null = null;
  let imdbUrl: string | null = null;
  let wikidataId: string | null = null;
  let wikidataUrl: string | null = null;

  const raw = row.wikidata_id;
  if (raw) {
    if (raw.startsWith("Q") && /^Q\d+$/.test(raw)) {
      wikidataId = raw;
      wikidataUrl = `https://www.wikidata.org/wiki/${raw}`;
    } else if (raw.startsWith("IMDB:")) {
      imdbId = raw.replace("IMDB:", "");
      imdbUrl = `https://www.imdb.com/company/${imdbId}/`;
    } else if (raw.startsWith("TMDB:")) {
      // TMDb ID stored in wikidata field — already covered by tmdb_entity_id
    } else if (/^Q/.test(raw)) {
      // Partial Q-ID match (shouldn't happen but be safe)
      wikidataId = raw;
      wikidataUrl = `https://www.wikidata.org/wiki/${raw}`;
    }
  }

  return {
    tmdb: { id: tmdbId, url: tmdbUrl },
    imdb: { id: imdbId, url: imdbUrl },
    wikidata: { id: wikidataId, url: wikidataUrl },
    wikipedia: { url: row.wikipedia_url },
    website: { url: row.homepage_url },
  };
}

export default function AdminNetworksPage() {
  const pathname = usePathname();
  const { user, checking, hasAccess } = useAdminGuard();
  const userIdentity = user?.email ?? user?.uid ?? null;
  const isProductionCompaniesPage = pathname === "/brands/production-companies" || pathname === "/admin/production-companies";
  const isLegacyNetworksPage = pathname === "/admin/networks" || pathname === "/brands/networks";
  const activeBrandsTab = isProductionCompaniesPage ? "production-companies" : "networks-streaming";
  const pageTitle = isProductionCompaniesPage ? "Production Companies" : "Networks & Streaming Services";
  const pageHref = isProductionCompaniesPage ? "/brands/production-companies" : "/brands/networks-and-streaming";
  const pageDescription = isProductionCompaniesPage
    ? "Production company coverage and sync health from the full Supabase show inventory."
    : "Coverage and sync health across network and streaming brand dimensions from the full Supabase show inventory.";

  const [summary, setSummary] = useState<NetworksStreamingSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<NetworksStreamingSyncResult | null>(null);
  const [showCompletionProgress, setShowCompletionProgress] = useState(false);
  const [showUnresolved, setShowUnresolved] = useState(false);
  const [refreshExternalSources, setRefreshExternalSources] = useState(false);

  const [overrides, setOverrides] = useState<Record<string, OverrideRow>>({});
  const [overrideDrafts, setOverrideDrafts] = useState<Record<string, OverrideDraft>>({});
  const [overridesLoading, setOverridesLoading] = useState(false);
  const [overridesError, setOverridesError] = useState<string | null>(null);
  const [overridesReadOnly, setOverridesReadOnly] = useState(false);
  const [overridesErrorCode, setOverridesErrorCode] = useState<string | null>(null);
  const [savingOverrideKey, setSavingOverrideKey] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(isProductionCompaniesPage ? "production" : "all");

  useEffect(() => {
    if (isProductionCompaniesPage) {
      setTypeFilter("production");
      return;
    }
    if (isLegacyNetworksPage) {
      setTypeFilter("all");
    }
  }, [isLegacyNetworksPage, isProductionCompaniesPage]);

  const fetchWithAuth = useCallback(
    (input: RequestInfo | URL, init?: RequestInit) =>
      fetchAdminWithAuth(input, init, {
        preferredUser: user,
      }),
    [user],
  );

  const loadNetworksStreamingSummary = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!silent) {
      setSummaryLoading(true);
    }
    setSummaryError(null);
    try {
      const response = await fetchWithAuth("/api/admin/networks-streaming/summary", {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        setSummaryError((await parseErrorPayload(response)).message);
        setSummary(null);
        return;
      }
      const payload = (await response.json()) as NetworksStreamingSummary;
      setSummary(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load summary";
      setSummaryError(message);
      setSummary(null);
    } finally {
      if (!silent) {
        setSummaryLoading(false);
      }
    }
  }, [fetchWithAuth]);

  const loadOverrides = useCallback(async () => {
    setOverridesLoading(true);
    setOverridesError(null);
    setOverridesReadOnly(false);
    setOverridesErrorCode(null);
    try {
      const response = await fetchWithAuth("/api/admin/networks-streaming/overrides?active_only=true", {
        method: "GET",
        cache: "no-store",
      });
      if (!response.ok) {
        const payload = await parseErrorPayload(response);
        if (payload.code === "not_authenticated_for_overrides") {
          setOverridesReadOnly(true);
          setOverridesErrorCode(payload.code);
          setOverridesError("Overrides are read-only for this session. Summary rows loaded successfully.");
        } else if (payload.code === "backend_override_unavailable") {
          setOverridesErrorCode(payload.code);
          setOverridesError("Overrides backend is unavailable right now. Summary rows are still available.");
        } else {
          setOverridesErrorCode(payload.code ?? "unknown");
          setOverridesError(payload.message);
        }
        setOverrides({});
        return;
      }
      const payload = (await response.json()) as OverrideRow[];
      const byKey: Record<string, OverrideRow> = {};
      for (const row of payload) {
        const key = `${row.entity_type}:${row.entity_key}`;
        byKey[key] = row;
      }
      setOverrides(byKey);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load overrides";
      if (message === "Not authenticated") {
        setOverridesReadOnly(true);
        setOverridesErrorCode("not_authenticated_for_overrides");
        setOverridesError("Overrides are read-only for this session. Summary rows loaded successfully.");
      } else {
        setOverridesErrorCode("unknown");
        setOverridesError(message);
      }
      setOverrides({});
    } finally {
      setOverridesLoading(false);
    }
  }, [fetchWithAuth]);

  useEffect(() => {
    if (!checking && userIdentity && hasAccess) {
      void loadNetworksStreamingSummary();
      void loadOverrides();
    }
  }, [checking, hasAccess, loadNetworksStreamingSummary, loadOverrides, userIdentity]);

  useEffect(() => {
    if (!syncing || checking || !userIdentity || !hasAccess) return;

    const pollSummary = () => {
      void loadNetworksStreamingSummary({ silent: true });
    };
    pollSummary();
    const intervalId = window.setInterval(pollSummary, 3500);
    return () => window.clearInterval(intervalId);
  }, [checking, hasAccess, loadNetworksStreamingSummary, syncing, userIdentity]);

  const onSyncNetworksStreaming = useCallback(
    async (options?: {
      unresolvedOnly?: boolean;
      resumeRunId?: string;
      entityType?: NetworksStreamingType;
      entityKeys?: string[];
    }) => {
      const unresolvedOnly = Boolean(options?.unresolvedOnly);
      setShowCompletionProgress(true);
      setSyncing(true);
      setSyncError(null);
      if (!unresolvedOnly) {
        setSyncResult(null);
      }
      try {
        const response = await fetchWithAuth("/api/admin/networks-streaming/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            unresolved_only: unresolvedOnly,
            refresh_external_sources: refreshExternalSources,
            batch_size: 25,
            max_runtime_sec: 840,
            ...(options?.entityType ? { entity_type: options.entityType } : {}),
            ...(Array.isArray(options?.entityKeys) && options.entityKeys.length > 0
              ? { entity_keys: options.entityKeys.map((item) => normalizeEntityKey(item)).filter(Boolean) }
              : {}),
            ...(typeof options?.resumeRunId === "string" && options.resumeRunId.trim().length > 0
              ? { resume_run_id: options.resumeRunId.trim() }
              : {}),
          }),
        });

        if (!response.ok) {
          setSyncError((await parseErrorPayload(response)).message);
          return;
        }

        const payload = (await response.json()) as NetworksStreamingSyncResult;
        setSyncResult(payload);
        setShowUnresolved(Boolean(payload.unresolved_logos_count));
        await loadNetworksStreamingSummary();
        await loadOverrides();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to trigger sync";
        setSyncError(message);
      } finally {
        setSyncing(false);
        setShowCompletionProgress(false);
      }
    },
    [fetchWithAuth, loadNetworksStreamingSummary, loadOverrides, refreshExternalSources],
  );

  const onRefreshSummary = useCallback(() => {
    const refreshSummary = async () => {
      setShowCompletionProgress(true);
      try {
        await loadNetworksStreamingSummary();
      } finally {
        setShowCompletionProgress(false);
      }
    };
    void refreshSummary();
  }, [loadNetworksStreamingSummary]);

  const unresolvedRows = useMemo(() => {
    if (syncResult?.unresolved_logos && syncResult.unresolved_logos.length > 0) {
      return syncResult.unresolved_logos;
    }
    return (summary?.rows ?? [])
      .filter((row) => {
        if (row.type === "production") {
          return row.resolution_status !== "resolved";
        }
        return !row.has_logo || !row.has_links || !row.has_bw_variants;
      })
      .map((row) => ({
        type: row.type,
        id: normalizeEntityKey(row.name),
        name: row.name,
        reason:
          row.resolution_reason ||
          (row.type === "production"
            ? "missing_reference_metadata"
            : !row.has_links
              ? "missing_links"
              : !row.has_logo
                ? "missing_logo"
                : "missing_bw_variants"),
      }));
  }, [summary?.rows, syncResult?.unresolved_logos]);
  const unresolvedProductionRows = useMemo(
    () => unresolvedRows.filter((row) => row.type === "production"),
    [unresolvedRows],
  );

  const completionStats = useMemo(() => {
    if (syncResult) {
      const unresolvedTotal = syncResult.completion_unresolved_total ?? syncResult.completion_unresolved;
      return {
        total: syncResult.completion_total,
        resolved: syncResult.completion_resolved,
        unresolved: unresolvedTotal,
        percent: syncResult.completion_percent,
        gatePassed:
          syncResult.completion_gate_passed &&
          syncResult.missing_columns.length === 0 &&
          unresolvedTotal === 0,
      };
    }
    const rows = summary?.rows ?? [];
    const total = rows.length;
    const resolved = rows.filter((row) => row.resolution_status === "resolved").length;
    const unresolved = Math.max(0, total - resolved);
    const percent = total > 0 ? Number(((resolved / total) * 100).toFixed(2)) : 0;
    return {
      total,
      resolved,
      unresolved,
      percent,
      gatePassed: unresolved === 0,
    };
  }, [summary?.rows, syncResult]);

  const missingLogoCount = useMemo(
    () => (summary?.rows ?? []).filter((row) => !row.has_logo).length,
    [summary?.rows],
  );
  const missingLinksCount = useMemo(
    () => (summary?.rows ?? []).filter((row) => !row.has_links).length,
    [summary?.rows],
  );
  const missingBwVariantsCount = useMemo(
    () => (summary?.rows ?? []).filter((row) => !row.has_bw_variants).length,
    [summary?.rows],
  );
  const productionMissingLogoCount = useMemo(() => {
    if (syncResult) {
      return syncResult.production_missing_logos ?? 0;
    }
    return (summary?.rows ?? []).filter((row) => row.type === "production" && !row.has_logo).length;
  }, [summary?.rows, syncResult]);
  const productionMissingBwCount = useMemo(() => {
    if (syncResult) {
      return syncResult.production_missing_bw_variants ?? 0;
    }
    return (summary?.rows ?? []).filter((row) => row.type === "production" && !row.has_bw_variants).length;
  }, [summary?.rows, syncResult]);

  const missingColumns = syncResult?.missing_columns ?? [];

  const filteredRows = useMemo(() => {
    const rows = summary?.rows ?? [];
    if (typeFilter === "all") {
      return rows;
    }
    return rows.filter((row) => row.type === typeFilter);
  }, [summary?.rows, typeFilter]);

  const draftFor = useCallback(
    (item: UnresolvedLogoItem): OverrideDraft => {
      const mapKey = `${item.type}:${normalizeEntityKey(item.name)}`;
      const existing = overrideDrafts[mapKey];
      if (existing) {
        return existing;
      }
      const override = overrides[mapKey];
      let logoUrl = "";
      if (override?.logo_source_urls_override && Array.isArray(override.logo_source_urls_override)) {
        const first = override.logo_source_urls_override.find((entry) => typeof entry === "string") as string | undefined;
        if (first) logoUrl = first;
      }
      return {
        wikidata_id_override: override?.wikidata_id_override ?? "",
        wikipedia_url_override: override?.wikipedia_url_override ?? "",
        logo_source_url: logoUrl,
        notes: override?.notes ?? "",
      };
    },
    [overrideDrafts, overrides],
  );

  const onChangeOverrideDraft = useCallback(
    (item: UnresolvedLogoItem, field: keyof OverrideDraft, value: string) => {
      const mapKey = `${item.type}:${normalizeEntityKey(item.name)}`;
      setOverrideDrafts((prev) => ({
        ...prev,
        [mapKey]: {
          ...draftFor(item),
          [field]: value,
        },
      }));
    },
    [draftFor],
  );

  const onSaveOverride = useCallback(
    async (item: UnresolvedLogoItem) => {
      if (overridesReadOnly) {
        setSyncError("Overrides are read-only for this session.");
        return;
      }
      const mapKey = `${item.type}:${normalizeEntityKey(item.name)}`;
      const draft = draftFor(item);
      setSavingOverrideKey(mapKey);
      setSyncError(null);
      try {
        const payload = {
          entity_type: item.type,
          entity_key: normalizeEntityKey(item.name),
          display_name_override: item.name,
          wikidata_id_override: draft.wikidata_id_override || null,
          wikipedia_url_override: draft.wikipedia_url_override || null,
          logo_source_urls_override: draft.logo_source_url
            ? [{ source: "override", url: draft.logo_source_url }]
            : [],
          notes: draft.notes || null,
          is_active: true,
        };
        const response = await fetchWithAuth("/api/admin/networks-streaming/overrides", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
        if (!response.ok) {
          setSyncError((await parseErrorPayload(response)).message);
          return;
        }
        await loadOverrides();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to save override";
        setSyncError(message);
      } finally {
        setSavingOverrideKey(null);
      }
    },
    [draftFor, fetchWithAuth, loadOverrides, overridesReadOnly],
  );

  const onExportUnresolvedCsv = useCallback(() => {
    const rows = unresolvedRows;
    if (!rows.length) return;
    const lines = ["type,name,reason"];
    for (const row of rows) {
      lines.push(`${csvEscape(row.type)},${csvEscape(row.name)},${csvEscape(row.reason)}`);
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = "brands-unresolved.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
  }, [unresolvedRows]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Preparing brands dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return null;
  }

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        <AdminGlobalHeader bodyClassName="px-6 py-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <AdminBreadcrumbs items={buildBrandsPageBreadcrumb(pageTitle, pageHref)} className="mb-1" />
              <h1 className="break-words text-3xl font-bold text-zinc-900">{pageTitle}</h1>
              <p className="break-words text-sm text-zinc-500">{pageDescription}</p>
              <BrandsTabs activeTab={activeBrandsTab} className="mt-4" />
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin"
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Back to Admin
              </Link>
            </div>
          </div>
        </AdminGlobalHeader>

        <main className="mx-auto max-w-6xl px-6 py-8">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 border-b border-zinc-200 pb-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-3">
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1">
                    Available Shows: {summary?.totals.total_available_shows ?? "-"}
                  </span>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1">
                    Added Shows: {summary?.totals.total_added_shows ?? "-"}
                  </span>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1">Missing Logos: {missingLogoCount}</span>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1">Missing B/W Variants: {missingBwVariantsCount}</span>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1">Missing Links: {missingLinksCount}</span>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1">
                    Production Missing Logos: {productionMissingLogoCount}
                  </span>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1">
                    Production Missing B/W: {productionMissingBwCount}
                  </span>
                </div>
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                    <p className="font-semibold text-zinc-900">Completion Gate</p>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        completionStats.gatePassed
                          ? "bg-green-100 text-green-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {completionStats.gatePassed ? "100% Ready" : "Manual Fixes Required"}
                    </span>
                  </div>
                  {showCompletionProgress ? (
                    <>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                        <div
                          data-testid="completion-gate-progress-bar"
                          className={`h-full bg-zinc-900 transition-[width] duration-500 ${
                            syncing || summaryLoading ? "animate-pulse" : ""
                          }`}
                          style={{ width: `${Math.min(100, completionStats.percent)}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-zinc-700">
                        Resolved {completionStats.resolved} / {completionStats.total} ({completionStats.percent.toFixed(2)}%)
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-xs text-zinc-700">
                      Progress bar appears after a manual Refresh or Sync run.
                    </p>
                  )}
                </div>
                <p className="text-xs text-zinc-600">
                  Production logos are optional and tracked separately as backlog.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onRefreshSummary}
                  disabled={summaryLoading || syncing}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {summaryLoading ? "Refreshing..." : "Refresh"}
                </button>
                <button
                  type="button"
                  onClick={() => void onSyncNetworksStreaming()}
                  disabled={syncing}
                  className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-500"
                >
                  {syncing ? "Syncing..." : "Sync/Mirror Brands"}
                </button>
                <button
                  type="button"
                  onClick={() => void onSyncNetworksStreaming({ unresolvedOnly: true })}
                  disabled={syncing || unresolvedRows.length === 0}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Re-run Unresolved Only
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void onSyncNetworksStreaming({
                      unresolvedOnly: true,
                      entityType: "production",
                      entityKeys: unresolvedProductionRows.map((row) => row.name),
                    })
                  }
                  disabled={syncing || unresolvedProductionRows.length === 0}
                  className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Re-run Unresolved Production Only
                </button>
                {syncResult?.status === "stopped" ? (
                  <button
                    type="button"
                    onClick={() => void onSyncNetworksStreaming({ resumeRunId: syncResult.run_id })}
                    disabled={syncing}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Resume Sync
                  </button>
                ) : null}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                id="refresh-external-sources"
                type="checkbox"
                checked={refreshExternalSources}
                onChange={(event) => setRefreshExternalSources(event.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
              />
              <label htmlFor="refresh-external-sources" className="text-xs text-zinc-700">
                Refresh external catalogs (uses credits)
              </label>
            </div>
            <p className="mt-2 text-xs text-zinc-600">
              Unresolved production entities: {unresolvedProductionRows.length}
            </p>

            {summaryError ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{summaryError}</div>
            ) : null}
            {syncError ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{syncError}</div>
            ) : null}
            {overridesError ? (
              <div
                className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
                  overridesErrorCode === "not_authenticated_for_overrides"
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {overridesError}
              </div>
            ) : null}

            <div className={`mt-4 rounded-lg border px-3 py-2 text-sm ${missingColumns.length > 0 ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`}>
              <p className="font-semibold">Schema Health</p>
              {missingColumns.length > 0 ? (
                <ul className="mt-1 list-disc pl-5">
                  {missingColumns.map((item) => (
                    <li key={`${item.table}:${item.column}`}>{item.table}.{item.column}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1">All required columns are present.</p>
              )}
            </div>

            {syncResult ? (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                <p className="font-semibold">Sync complete</p>
                <p className="mt-1 [overflow-wrap:anywhere]">
                  Run: {syncResult.run_id} | Status: {syncResult.status}
                  {syncResult.resume_cursor
                    ? ` | Resume Cursor: ${syncResult.resume_cursor.entity_type}:${syncResult.resume_cursor.entity_key}`
                    : ""}
                </p>
                <p className="mt-1 [overflow-wrap:anywhere]">
                  Entities synced: {syncResult.entities_synced} | Providers synced: {syncResult.providers_synced} | Links enriched: {" "}
                  {syncResult.links_enriched} | Logos mirrored: {syncResult.logos_mirrored} | Black variants: {" "}
                  {syncResult.variants_black_mirrored} | White variants: {syncResult.variants_white_mirrored} | Assets discovered: {" "}
                  {syncResult.logo_assets_discovered} | Assets mirrored: {syncResult.logo_assets_mirrored} | Assets skipped: {" "}
                  {syncResult.logo_assets_skipped} | Assets failed: {syncResult.logo_assets_failed} | Unresolved: {" "}
                  {syncResult.unresolved_logos_count} | Unresolved by type (N/S/P): {" "}
                  {syncResult.completion_unresolved_network ?? 0}/{syncResult.completion_unresolved_streaming ?? 0}/
                  {syncResult.completion_unresolved_production ?? 0} | Production logo backlog: {syncResult.production_missing_logos ?? 0} logos,{" "}
                  {syncResult.production_missing_bw_variants ?? 0} B/W | Failures: {syncResult.failures}
                </p>
              </div>
            ) : null}

            <div className="mt-4 overflow-x-auto">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {!isProductionCompaniesPage ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setTypeFilter("all")}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        typeFilter === "all"
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setTypeFilter("network")}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        typeFilter === "network"
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
                      }`}
                    >
                      Network
                    </button>
                    <button
                      type="button"
                      onClick={() => setTypeFilter("streaming")}
                      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                        typeFilter === "streaming"
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
                      }`}
                    >
                      Streaming Services
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  onClick={() => setTypeFilter("production")}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    typeFilter === "production"
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  Production Companies
                </button>
              </div>
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">Type</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">Brand</th>
                    <th className="px-3 py-2 text-right font-semibold text-zinc-700">Available Shows</th>
                    <th className="px-3 py-2 text-right font-semibold text-zinc-700">Added Shows</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">Logo</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">External IDs</th>
                    <th className="px-3 py-2 text-left font-semibold text-zinc-700">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 bg-white">
                  {summaryLoading ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-zinc-500">
                        Loading brands summary...
                      </td>
                    </tr>
                  ) : null}

                  {!summaryLoading && filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-8 text-center text-zinc-500">
                        No rows available.
                      </td>
                    </tr>
                  ) : null}

                  {!summaryLoading
                    ? filteredRows.map((row) => {
                        const extIds = getExternalIds(row);
                        const rowComplete =
                          row.type === "production"
                            ? row.resolution_status === "resolved"
                            : row.has_logo && row.has_bw_variants && row.has_links;
                        return (
                          <tr key={`${row.type}:${row.name}`}>
                            <td className="px-3 py-2 text-zinc-700">
                              {row.type === "network" ? "Network" : row.type === "streaming" ? "Streaming" : "Production"}
                            </td>
                            <td className="max-w-[300px] px-3 py-2 font-medium text-zinc-900 [overflow-wrap:anywhere]">
                              <Link
                                href={`/brands/networks-and-streaming/${row.type}/${toEntitySlug(row.name)}`}
                                className="text-zinc-900 underline-offset-2 hover:underline"
                              >
                                {row.name}
                              </Link>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-zinc-700">{row.available_show_count}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-zinc-700">{row.added_show_count}</td>
                            <td className="px-3 py-2">
                              {row.hosted_logo_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={row.hosted_logo_url}
                                  alt={`${row.name} logo`}
                                  className="h-7 max-w-[120px] object-contain"
                                />
                              ) : (
                                <span className="text-zinc-500">Missing</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                {extIds.tmdb.url ? (
                                  <a
                                    href={extIds.tmdb.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 no-underline hover:bg-green-200"
                                  >
                                    TMDb
                                  </a>
                                ) : (
                                  <span className="rounded px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700">TMDb</span>
                                )}
                                {extIds.imdb.url ? (
                                  <a
                                    href={extIds.imdb.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 no-underline hover:bg-green-200"
                                  >
                                    IMDb
                                  </a>
                                ) : (
                                  <span className="rounded px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700">IMDb</span>
                                )}
                                {extIds.wikidata.url ? (
                                  <a
                                    href={extIds.wikidata.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 no-underline hover:bg-green-200"
                                  >
                                    Wikidata
                                  </a>
                                ) : (
                                  <span className="rounded px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700">Wikidata</span>
                                )}
                                {extIds.wikipedia.url ? (
                                  <a
                                    href={extIds.wikipedia.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 no-underline hover:bg-green-200"
                                  >
                                    Wikipedia
                                  </a>
                                ) : (
                                  <span className="rounded px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700">Wikipedia</span>
                                )}
                                {extIds.website.url ? (
                                  <a
                                    href={extIds.website.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 no-underline hover:bg-green-200"
                                  >
                                    Website
                                  </a>
                                ) : (
                                  <span className="rounded px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700">Website</span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-wrap gap-1">
                                {!row.has_logo ? (
                                  <span
                                    className={`rounded px-2 py-0.5 text-xs font-semibold ${
                                      row.type === "production" ? "bg-zinc-100 text-zinc-700" : "bg-red-100 text-red-700"
                                    }`}
                                  >
                                    {row.type === "production" ? "logo optional" : "missing logo"}
                                  </span>
                                ) : null}
                                {!row.has_bw_variants ? (
                                  <span
                                    className={`rounded px-2 py-0.5 text-xs font-semibold ${
                                      row.type === "production" ? "bg-zinc-100 text-zinc-700" : "bg-amber-100 text-amber-700"
                                    }`}
                                  >
                                    {row.type === "production" ? "B/W optional" : "missing B/W"}
                                  </span>
                                ) : null}
                                {!row.has_links ? (
                                  <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">missing links</span>
                                ) : null}
                                {rowComplete ? (
                                  <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">complete</span>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    : null}
                </tbody>
              </table>
            </div>

            <div className="mt-6 rounded-lg border border-zinc-200 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-zinc-900">Unresolved Entities</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowUnresolved((prev) => !prev)}
                    className="text-xs font-semibold text-zinc-800 underline"
                  >
                    {showUnresolved ? "Hide" : "Show"} unresolved ({unresolvedRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={onExportUnresolvedCsv}
                    disabled={unresolvedRows.length === 0}
                    className="rounded border border-zinc-300 px-2 py-1 text-xs font-semibold text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Export CSV
                  </button>
                </div>
              </div>

              {showUnresolved ? (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full divide-y divide-zinc-200 text-xs">
                    <thead className="bg-zinc-50">
                      <tr>
                        <th className="px-2 py-2 text-left font-semibold text-zinc-700">Type</th>
                        <th className="px-2 py-2 text-left font-semibold text-zinc-700">Name</th>
                        <th className="px-2 py-2 text-left font-semibold text-zinc-700">Reason</th>
                        <th className="px-2 py-2 text-left font-semibold text-zinc-700">Override</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 bg-white">
                      {unresolvedRows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-2 py-4 text-center text-zinc-500">
                            No unresolved entities.
                          </td>
                        </tr>
                      ) : (
                        unresolvedRows.map((item) => {
                          const mapKey = `${item.type}:${normalizeEntityKey(item.name)}`;
                          const draft = draftFor(item);
                          const matchingSummary = (summary?.rows ?? []).find(
                            (row) => row.type === item.type && normalizeEntityKey(row.name) === normalizeEntityKey(item.name),
                          );
                          return (
                            <tr key={`${item.type}:${item.id}:${item.reason}`}>
                              <td className="px-2 py-2 text-zinc-700">{item.type}</td>
                              <td className="max-w-[260px] px-2 py-2 font-medium text-zinc-900 [overflow-wrap:anywhere]">
                                {item.name}
                                {matchingSummary?.last_attempt_at ? (
                                  <div className="text-[10px] text-zinc-500">last attempt: {matchingSummary.last_attempt_at}</div>
                                ) : null}
                              </td>
                              <td className="max-w-[220px] px-2 py-2 text-zinc-700 [overflow-wrap:anywhere]">{item.reason}</td>
                              <td className="px-2 py-2">
                                <div className="grid gap-1 md:grid-cols-2">
                                  <input
                                    value={draft.wikidata_id_override}
                                    onChange={(event) => onChangeOverrideDraft(item, "wikidata_id_override", event.target.value)}
                                    placeholder="Wikidata ID"
                                    disabled={overridesReadOnly}
                                    className="rounded border border-zinc-300 px-2 py-1"
                                  />
                                  <input
                                    value={draft.wikipedia_url_override}
                                    onChange={(event) => onChangeOverrideDraft(item, "wikipedia_url_override", event.target.value)}
                                    placeholder="Wikipedia URL"
                                    disabled={overridesReadOnly}
                                    className="rounded border border-zinc-300 px-2 py-1"
                                  />
                                  <input
                                    value={draft.logo_source_url}
                                    onChange={(event) => onChangeOverrideDraft(item, "logo_source_url", event.target.value)}
                                    placeholder="Logo source URL"
                                    disabled={overridesReadOnly}
                                    className="rounded border border-zinc-300 px-2 py-1 md:col-span-2"
                                  />
                                  <input
                                    value={draft.notes}
                                    onChange={(event) => onChangeOverrideDraft(item, "notes", event.target.value)}
                                    placeholder="Notes"
                                    disabled={overridesReadOnly}
                                    className="rounded border border-zinc-300 px-2 py-1 md:col-span-2"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => void onSaveOverride(item)}
                                    disabled={savingOverrideKey === mapKey || overridesLoading || overridesReadOnly}
                                    className="rounded bg-zinc-900 px-2 py-1 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-500 md:col-span-2"
                                  >
                                    {overridesReadOnly
                                      ? "Read-only session"
                                      : savingOverrideKey === mapKey
                                        ? "Saving..."
                                        : "Save Override"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                  {syncResult?.unresolved_logos_truncated ? (
                    <p className="mt-2 text-[11px] text-zinc-600">Showing first 300 unresolved entries from sync payload.</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
        </main>
      </div>
    </ClientOnly>
  );
}
