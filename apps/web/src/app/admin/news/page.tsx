"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import ClientOnly from "@/components/ClientOnly";
import BrandsTabs from "@/components/admin/BrandsTabs";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import BrandLogoOptionsModal from "@/components/admin/BrandLogoOptionsModal";
import { buildBrandsPageBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { canonicalizeHostedMediaUrl } from "@/lib/hosted-media";

interface BrandLogoRow {
  id: string;
  target_type: string;
  target_key: string;
  target_label: string;
  source_url: string | null;
  source_domain: string | null;
  logo_role?: string | null;
  source_provider?: string | null;
  discovered_from?: string | null;
  hosted_logo_url: string | null;
  hosted_logo_black_url: string | null;
  hosted_logo_white_url: string | null;
  is_primary: boolean;
  is_selected_for_role?: boolean | null;
  option_kind?: string | null;
  updated_at: string | null;
}

interface BrandLogoCard {
  id: string;
  target_type: string;
  target_key: string;
  target_label: string;
  source_url: string | null;
  source_domain: string | null;
  source_provider: string | null;
  discovered_from: string | null;
  wordmark_url: string | null;
  icon_url: string | null;
  updated_at: string | null;
}

type LogoPickerState = {
  targetType: "publication" | "social";
  targetKey: string;
  targetLabel: string;
};

type CardFilter = "all" | "missing" | "complete";
type CardSort = "attention" | "alpha" | "recent";

const PLACEHOLDER_ICON_PATH = "/icons/brand-placeholder.svg";

function normalizeProviderLabel(value: string | null | undefined): string {
  return String(value || "unknown")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function getCardStatus(row: BrandLogoCard): "missing-both" | "missing-wordmark" | "missing-icon" | "complete" {
  if (!row.wordmark_url && !row.icon_url) return "missing-both";
  if (!row.wordmark_url) return "missing-wordmark";
  if (!row.icon_url) return "missing-icon";
  return "complete";
}

function compareCards(left: BrandLogoCard, right: BrandLogoCard, sortMode: CardSort): number {
  if (sortMode === "recent") {
    const leftTs = left.updated_at ? Date.parse(left.updated_at) : 0;
    const rightTs = right.updated_at ? Date.parse(right.updated_at) : 0;
    if (rightTs !== leftTs) return rightTs - leftTs;
    return left.target_label.localeCompare(right.target_label);
  }
  if (sortMode === "alpha") {
    return left.target_label.localeCompare(right.target_label);
  }

  const rank = (row: BrandLogoCard): number => {
    const status = getCardStatus(row);
    if (status === "missing-both") return 0;
    if (status === "missing-wordmark") return 1;
    if (status === "missing-icon") return 2;
    return 3;
  };

  const rankDiff = rank(left) - rank(right);
  if (rankDiff !== 0) return rankDiff;
  return left.target_label.localeCompare(right.target_label);
}

export default function AdminNewsPage() {
  const { user, checking, hasAccess } = useAdminGuard();
  const [searchDraft, setSearchDraft] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [rows, setRows] = useState<BrandLogoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [logoPickerState, setLogoPickerState] = useState<LogoPickerState | null>(null);
  const [statusFilter, setStatusFilter] = useState<CardFilter>("all");
  const [sortMode, setSortMode] = useState<CardSort>("attention");

  const fetchWithAuth = useCallback(
    (input: RequestInfo | URL, init?: RequestInit) =>
      fetchAdminWithAuth(input, init, {
        preferredUser: user,
        allowDevAdminBypass: true,
      }),
    [user]
  );

  const loadLogos = useCallback(async (queryOverride?: string) => {
    const normalizedQuery = (queryOverride ?? activeQuery).trim();
    setLoading(true);
    setError(null);
    try {
      const loadByType = async (targetType: "publication" | "social"): Promise<BrandLogoRow[]> => {
        const pageSize = 500;
        const merged: BrandLogoRow[] = [];
        let offset = 0;
        let totalCount = Number.POSITIVE_INFINITY;
        while (offset < totalCount) {
          const response = await fetchWithAuth(
            `/api/admin/trr-api/brands/logos?target_type=${targetType}&q=${encodeURIComponent(normalizedQuery)}&limit=${pageSize}&offset=${offset}&include_missing=true`,
            { cache: "no-store" }
          );
          if (!response.ok) {
            const payload = (await response.json().catch(() => ({}))) as { error?: string };
            throw new Error(payload.error || `Failed to load ${targetType} logos`);
          }
          const payload = (await response.json().catch(() => ({}))) as { rows?: BrandLogoRow[]; count?: number };
          const rows = Array.isArray(payload.rows) ? payload.rows : [];
          merged.push(...rows);
          totalCount = Number(payload.count ?? rows.length);
          if (rows.length < pageSize) break;
          offset += rows.length;
        }
        return merged;
      };
      const [publicationRows, socialRows] = await Promise.all([loadByType("publication"), loadByType("social")]);
      setRows([...publicationRows, ...socialRows]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load logos");
    } finally {
      setLoading(false);
    }
  }, [activeQuery, fetchWithAuth]);

  const syncNewsPageLogos = useCallback(async () => {
    setSyncing(true);
    setSyncNotice(null);
    setSyncError(null);
    try {
      const response = await fetchWithAuth("/api/admin/trr-api/brands/logos/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "page",
          page: "news",
          target_types: ["publication", "social"],
          only_missing: true,
          force: false,
          limit: 200,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        targets_scanned?: number;
        imports_created?: number;
        imports_updated?: number;
        unresolved?: number;
      };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to sync publication/social logos");
      }
      setSyncNotice(
        `Scanned ${Number(payload.targets_scanned ?? 0)} targets, imported ${
          Number(payload.imports_created ?? 0) + Number(payload.imports_updated ?? 0)
        }, unresolved ${Number(payload.unresolved ?? 0)}.`,
      );
      await loadLogos();
    } catch (syncErr) {
      setSyncError(syncErr instanceof Error ? syncErr.message : "Failed to sync logos");
    } finally {
      setSyncing(false);
    }
  }, [fetchWithAuth, loadLogos]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const nextQuery = searchDraft.trim();
      setActiveQuery((previous) => (previous === nextQuery ? previous : nextQuery));
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [searchDraft]);

  useEffect(() => {
    if (checking || !user || !hasAccess) return;
    void loadLogos();
  }, [activeQuery, checking, hasAccess, loadLogos, user]);

  const cards = useMemo<BrandLogoCard[]>(() => {
    const grouped = new Map<string, BrandLogoCard>();
    const chooseHostedUrl = (row: BrandLogoRow): string | null =>
      canonicalizeHostedMediaUrl(
        row.hosted_logo_url || row.hosted_logo_black_url || row.hosted_logo_white_url,
      ) ??
      row.hosted_logo_url ??
      row.hosted_logo_black_url ??
      row.hosted_logo_white_url ??
      null;

    for (const row of rows) {
      const key = `${row.target_type}:${row.target_key}`;
      const role = String(row.logo_role || "").trim().toLowerCase();
      const hostedUrl = chooseHostedUrl(row);
      const current = grouped.get(key) ?? {
        id: row.id || key,
        target_type: row.target_type,
        target_key: row.target_key,
        target_label: row.target_label || row.target_key,
        source_url: row.source_url,
        source_domain: row.source_domain,
        source_provider: row.source_provider ?? null,
        discovered_from: row.discovered_from ?? null,
        wordmark_url: null,
        icon_url: null,
        updated_at: row.updated_at,
      };

      if (role === "icon") {
        if ((row.is_selected_for_role || !current.icon_url) && hostedUrl) current.icon_url = hostedUrl;
      } else if (role === "wordmark") {
        if ((row.is_selected_for_role || !current.wordmark_url) && hostedUrl) current.wordmark_url = hostedUrl;
      } else if (row.is_primary) {
        if (!current.wordmark_url && hostedUrl) current.wordmark_url = hostedUrl;
      } else if (!current.icon_url && hostedUrl) {
        current.icon_url = hostedUrl;
      } else if (!current.wordmark_url && hostedUrl) {
        current.wordmark_url = hostedUrl;
      }

      const currentTs = current.updated_at ? Date.parse(current.updated_at) : 0;
      const rowTs = row.updated_at ? Date.parse(row.updated_at) : 0;
      if (rowTs >= currentTs) {
        current.updated_at = row.updated_at;
        if (row.source_provider) current.source_provider = row.source_provider;
        if (row.discovered_from) current.discovered_from = row.discovered_from;
      } else {
        if (!current.source_provider && row.source_provider) current.source_provider = row.source_provider;
        if (!current.discovered_from && row.discovered_from) current.discovered_from = row.discovered_from;
      }
      grouped.set(key, current);
    }

    return [...grouped.values()];
  }, [rows]);

  const visibleCards = useMemo(() => {
    const filtered = cards.filter((row) => {
      const status = getCardStatus(row);
      if (statusFilter === "missing") return status !== "complete";
      if (statusFilter === "complete") return status === "complete";
      return true;
    });
    return [...filtered].sort((left, right) => compareCards(left, right, sortMode));
  }, [cards, sortMode, statusFilter]);

  const publicationRows = useMemo(() => visibleCards.filter((row) => row.target_type === "publication"), [visibleCards]);
  const socialRows = useMemo(() => visibleCards.filter((row) => row.target_type === "social"), [visibleCards]);

  const stats = useMemo(() => {
    const total = cards.length;
    const missingWordmark = cards.filter((row) => !row.wordmark_url).length;
    const missingIcon = cards.filter((row) => !row.icon_url).length;
    const complete = cards.filter((row) => getCardStatus(row) === "complete").length;
    return { complete, missingIcon, missingWordmark, total };
  }, [cards]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Preparing publications workspace...</p>
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
              <AdminBreadcrumbs
                items={buildBrandsPageBreadcrumb("Publications / News", "/brands/news")}
                className="mb-1"
              />
              <h1 className="break-words text-3xl font-bold text-zinc-900">Publications / News</h1>
              <p className="break-words text-sm text-zinc-500">Editorial and publication brand tracking.</p>
              <BrandsTabs activeTab="news" className="mt-4" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void syncNewsPageLogos()}
                disabled={syncing}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
              >
                {syncing ? "Syncing..." : "Sync News/Publication Logos"}
              </button>
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
          <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                name="brands_news_search"
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    const nextQuery = searchDraft.trim();
                    if (nextQuery === activeQuery) {
                      void loadLogos(nextQuery);
                    } else {
                      setActiveQuery(nextQuery);
                    }
                  }
                  if (event.key === "Escape" && searchDraft) {
                    setSearchDraft("");
                  }
                }}
                placeholder="Search publication/social logos, labels, or domains..."
                className="min-w-[280px] flex-1 rounded border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
              />
              {searchDraft ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchDraft("");
                    if (activeQuery === "") {
                      void loadLogos("");
                    } else {
                      setActiveQuery("");
                    }
                  }}
                  className="rounded border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                >
                  Clear
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => void loadLogos(searchDraft)}
                disabled={loading}
                className="rounded border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {([
                ["all", `All (${cards.length})`],
                ["missing", `Needs Attention (${cards.length - stats.complete})`],
                ["complete", `Complete (${stats.complete})`],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatusFilter(value)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    statusFilter === value
                      ? "border-cyan-600 bg-cyan-600 text-white"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {label}
                </button>
              ))}
              <label className="ml-auto flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                Sort
                <select
                  name="brands_news_sort"
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as CardSort)}
                  className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-xs font-semibold tracking-normal text-zinc-700"
                >
                  <option value="attention">Needs Attention</option>
                  <option value="alpha">A-Z</option>
                  <option value="recent">Most Recent</option>
                </select>
              </label>
            </div>
            {error ? (
              <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            ) : null}
            {syncError ? (
              <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{syncError}</p>
            ) : null}
            {syncNotice ? (
              <p className="mt-3 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {syncNotice}
              </p>
            ) : null}
          </section>

          <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Tracked Brands", String(stats.total)],
              ["Missing Wordmarks", String(stats.missingWordmark)],
              ["Missing Icons", String(stats.missingIcon)],
              ["Complete", String(stats.complete)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-zinc-900">{value}</p>
              </div>
            ))}
          </section>

          <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-zinc-900">Publications ({publicationRows.length})</h2>
              <p className="text-sm text-zinc-500">Showing {publicationRows.length} of {cards.filter((row) => row.target_type === "publication").length}</p>
            </div>
            {publicationRows.length === 0 ? (
              <p className="text-sm text-zinc-500">No publication logos found for this filter.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {publicationRows.map((row) => (
                  <article
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer rounded border border-zinc-200 p-3 transition hover:border-zinc-300 hover:bg-zinc-50"
                    onClick={() =>
                      setLogoPickerState({
                        targetType: row.target_type as "publication" | "social",
                        targetKey: row.target_key,
                        targetLabel: row.target_label,
                      })
                    }
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      setLogoPickerState({
                        targetType: row.target_type as "publication" | "social",
                        targetKey: row.target_key,
                        targetLabel: row.target_label,
                      });
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-900">{row.target_label}</p>
                        <p className="truncate text-xs text-zinc-500">{row.target_key}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                        getCardStatus(row) === "complete"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {getCardStatus(row) === "complete" ? "Complete" : "Needs attention"}
                      </span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <div className="relative h-12 w-28 overflow-hidden rounded border border-zinc-200 bg-zinc-50">
                        <Image
                          src={row.wordmark_url || PLACEHOLDER_ICON_PATH}
                          alt={row.wordmark_url ? `${row.target_label} wordmark` : `${row.target_label} placeholder`}
                          fill
                          className="object-contain p-1"
                          unoptimized
                        />
                      </div>
                      <div className="relative h-12 w-12 overflow-hidden rounded border border-zinc-200 bg-zinc-50">
                        <Image
                          src={row.icon_url || PLACEHOLDER_ICON_PATH}
                          alt={row.icon_url ? `${row.target_label} icon` : `${row.target_label} placeholder icon`}
                          fill
                          className="object-contain p-1"
                          unoptimized
                        />
                      </div>
                    </div>
                    <div className="mt-2 space-y-1">
                      {row.source_provider ? (
                        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                          {normalizeProviderLabel(row.source_provider)}
                        </p>
                      ) : null}
                      <p className="text-xs text-zinc-500">
                        Wordmark: {row.wordmark_url ? "available" : "missing"} · Icon: {row.icon_url ? "available" : "missing"}
                      </p>
                    </div>
                    {!row.wordmark_url || !row.icon_url ? (
                      <p className="mt-1 text-xs text-amber-700">Missing {row.wordmark_url ? "icon" : row.icon_url ? "wordmark" : "wordmark + icon"}.</p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-zinc-900">Social ({socialRows.length})</h2>
              <p className="text-sm text-zinc-500">Showing {socialRows.length} of {cards.filter((row) => row.target_type === "social").length}</p>
            </div>
            {socialRows.length === 0 ? (
              <p className="text-sm text-zinc-500">No social logos found for this filter.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {socialRows.map((row) => (
                  <article
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer rounded border border-zinc-200 p-3 transition hover:border-zinc-300 hover:bg-zinc-50"
                    onClick={() =>
                      setLogoPickerState({
                        targetType: row.target_type as "publication" | "social",
                        targetKey: row.target_key,
                        targetLabel: row.target_label,
                      })
                    }
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      setLogoPickerState({
                        targetType: row.target_type as "publication" | "social",
                        targetKey: row.target_key,
                        targetLabel: row.target_label,
                      });
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-900">{row.target_label}</p>
                        <p className="truncate text-xs text-zinc-500">{row.target_key}</p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                        getCardStatus(row) === "complete"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {getCardStatus(row) === "complete" ? "Complete" : "Needs attention"}
                      </span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <div className="relative h-12 w-28 overflow-hidden rounded border border-zinc-200 bg-zinc-50">
                        <Image
                          src={row.wordmark_url || PLACEHOLDER_ICON_PATH}
                          alt={row.wordmark_url ? `${row.target_label} wordmark` : `${row.target_label} placeholder`}
                          fill
                          className="object-contain p-1"
                          unoptimized
                        />
                      </div>
                      <div className="relative h-12 w-12 overflow-hidden rounded border border-zinc-200 bg-zinc-50">
                        <Image
                          src={row.icon_url || PLACEHOLDER_ICON_PATH}
                          alt={row.icon_url ? `${row.target_label} icon` : `${row.target_label} placeholder icon`}
                          fill
                          className="object-contain p-1"
                          unoptimized
                        />
                      </div>
                    </div>
                    <div className="mt-2 space-y-1">
                      {row.source_provider ? (
                        <p className="mt-2 truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                          {normalizeProviderLabel(row.source_provider)}
                        </p>
                      ) : null}
                      <p className="text-xs text-zinc-500">
                        Wordmark: {row.wordmark_url ? "available" : "missing"} · Icon: {row.icon_url ? "available" : "missing"}
                      </p>
                    </div>
                    {!row.wordmark_url || !row.icon_url ? (
                      <p className="mt-1 text-xs text-amber-700">Missing {row.wordmark_url ? "icon" : row.icon_url ? "wordmark" : "wordmark + icon"}.</p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>
        {logoPickerState ? (
          <BrandLogoOptionsModal
            isOpen={Boolean(logoPickerState)}
            onClose={() => setLogoPickerState(null)}
            preferredUser={user}
            targetType={logoPickerState.targetType}
            targetKey={logoPickerState.targetKey}
            targetLabel={logoPickerState.targetLabel}
            onSaved={loadLogos}
          />
        ) : null}
      </div>
    </ClientOnly>
  );
}
