"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import BrandLogoOptionsModal from "@/components/admin/BrandLogoOptionsModal";
import BrandsTabs from "@/components/admin/BrandsTabs";
import { buildBrandsPageBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { BrandShowFranchiseRow } from "@/lib/admin/brands-shows-franchises";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";
import { canonicalizeHostedMediaUrl } from "@/lib/hosted-media";

type BrandLogoRow = {
  id: string;
  target_type: "show" | "franchise";
  target_key: string;
  target_label: string;
  hosted_logo_url: string | null;
  hosted_logo_black_url: string | null;
  hosted_logo_white_url: string | null;
  is_primary: boolean;
  logo_role?: string | null;
  source_provider?: string | null;
  is_selected_for_role?: boolean | null;
};

type LogoCard = {
  targetType: "show" | "franchise";
  targetKey: string;
  targetLabel: string;
  subtitle: string | null;
  wordmarkUrl: string | null;
  iconUrl: string | null;
  assetCount: number;
  sourceProvider: string | null;
};

type LogoPickerState = {
  targetType: "show" | "franchise";
  targetKey: string;
  targetLabel: string;
};

const PLACEHOLDER_ICON_PATH = "/icons/brand-placeholder.svg";

const SHOWS_FRANCHISES_ENABLED =
  (process.env.NEXT_PUBLIC_BRANDS_SHOWS_FRANCHISES_ENABLED ??
    process.env.BRANDS_SHOWS_FRANCHISES_ENABLED ??
    "true") !== "false";

const parseErrorPayload = async (response: Response): Promise<string> => {
  const fallback = `Request failed (${response.status})`;
  try {
    const payload = (await response.json()) as { error?: string; detail?: string; message?: string };
    if (typeof payload.error === "string") return payload.error;
    if (typeof payload.detail === "string") return payload.detail;
    if (typeof payload.message === "string") return payload.message;
    return fallback;
  } catch {
    return fallback;
  }
};

const normalizeProviderLabel = (value: string | null | undefined): string =>
  String(value ?? "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase()) || "Manual";

const pickDisplayUrl = (row: Pick<BrandLogoRow, "hosted_logo_url" | "hosted_logo_black_url" | "hosted_logo_white_url">) =>
  canonicalizeHostedMediaUrl(
    row.hosted_logo_url || row.hosted_logo_black_url || row.hosted_logo_white_url,
  ) ??
  row.hosted_logo_url ??
  row.hosted_logo_black_url ??
  row.hosted_logo_white_url ??
  null;

const updateCardFromLogoRow = (card: LogoCard, row: BrandLogoRow) => {
  const role = String(row.logo_role ?? "").trim().toLowerCase();
  const url = pickDisplayUrl(row);
  if (!url) return;

  if (role === "icon") {
    if (row.is_selected_for_role || !card.iconUrl) card.iconUrl = url;
  } else if (role === "wordmark") {
    if (row.is_selected_for_role || !card.wordmarkUrl) card.wordmarkUrl = url;
  } else if (row.is_primary) {
    if (!card.wordmarkUrl) card.wordmarkUrl = url;
  } else if (!card.iconUrl) {
    card.iconUrl = url;
  } else if (!card.wordmarkUrl) {
    card.wordmarkUrl = url;
  }

  card.assetCount += 1;
  if (!card.sourceProvider && row.source_provider) {
    card.sourceProvider = row.source_provider;
  }
};

const getCardStatus = (card: LogoCard): "complete" | "needs_attention" =>
  card.wordmarkUrl && card.iconUrl ? "complete" : "needs_attention";

export default function BrandsShowsAndFranchisesPage() {
  const { user, checking, hasAccess } = useAdminGuard();
  const [showQueryDraft, setShowQueryDraft] = useState("");
  const [showQuery, setShowQuery] = useState("");

  const [rows, setRows] = useState<BrandShowFranchiseRow[]>([]);
  const [rowsCount, setRowsCount] = useState(0);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [rowsError, setRowsError] = useState<string | null>(null);

  const [showLogoRows, setShowLogoRows] = useState<BrandLogoRow[]>([]);
  const [franchiseLogoRows, setFranchiseLogoRows] = useState<BrandLogoRow[]>([]);
  const [showLogoLoading, setShowLogoLoading] = useState(false);
  const [franchiseLogoLoading, setFranchiseLogoLoading] = useState(false);
  const [showLogoError, setShowLogoError] = useState<string | null>(null);
  const [franchiseLogoError, setFranchiseLogoError] = useState<string | null>(null);

  const [syncingPageLogos, setSyncingPageLogos] = useState(false);
  const [syncPageNotice, setSyncPageNotice] = useState<string | null>(null);
  const [syncPageError, setSyncPageError] = useState<string | null>(null);
  const [logoPickerState, setLogoPickerState] = useState<LogoPickerState | null>(null);

  const fetchWithAuth = useCallback(
    (input: RequestInfo | URL, init?: RequestInit) =>
      fetchAdminWithAuth(input, init, {
        allowDevAdminBypass: true,
        preferredUser: user,
      }),
    [user],
  );

  const loadShows = useCallback(async () => {
    setRowsLoading(true);
    setRowsError(null);
    try {
      const query = new URLSearchParams({ limit: "500" });
      if (showQuery.trim().length > 0) {
        query.set("q", showQuery.trim());
      }
      const response = await fetchWithAuth(
        `/api/admin/trr-api/brands/shows-franchises?${query.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );
      if (!response.ok) {
        setRowsError(await parseErrorPayload(response));
        setRows([]);
        setRowsCount(0);
        return;
      }
      const payload = (await response.json()) as { rows?: BrandShowFranchiseRow[]; count?: number };
      const nextRows = Array.isArray(payload.rows) ? payload.rows : [];
      setRows(nextRows);
      setRowsCount(typeof payload.count === "number" ? payload.count : nextRows.length);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load shows & franchises";
      setRowsError(message);
      setRows([]);
      setRowsCount(0);
    } finally {
      setRowsLoading(false);
    }
  }, [fetchWithAuth, showQuery]);

  const loadLogoRows = useCallback(
    async (targetType: "show" | "franchise") => {
      const setLoading = targetType === "show" ? setShowLogoLoading : setFranchiseLogoLoading;
      const setError = targetType === "show" ? setShowLogoError : setFranchiseLogoError;
      const setRowsState = targetType === "show" ? setShowLogoRows : setFranchiseLogoRows;
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams({
          target_type: targetType,
          limit: targetType === "show" ? "1200" : "500",
        });
        if (showQuery.trim().length > 0) {
          query.set("q", showQuery.trim());
        }
        const response = await fetchWithAuth(`/api/admin/trr-api/brands/logos?${query.toString()}`, {
          method: "GET",
          cache: "no-store",
        });
        if (!response.ok) {
          setError(await parseErrorPayload(response));
          setRowsState([]);
          return;
        }
        const payload = (await response.json().catch(() => ({}))) as { rows?: BrandLogoRow[] };
        setRowsState(Array.isArray(payload.rows) ? payload.rows : []);
      } catch (error) {
        const message = error instanceof Error ? error.message : `Failed to load ${targetType} logos`;
        setError(message);
        setRowsState([]);
      } finally {
        setLoading(false);
      }
    },
    [fetchWithAuth, showQuery],
  );

  const refreshAll = useCallback(async () => {
    await Promise.all([loadShows(), loadLogoRows("show"), loadLogoRows("franchise")]);
  }, [loadLogoRows, loadShows]);

  const syncShowsPageLogos = useCallback(async () => {
    setSyncingPageLogos(true);
    setSyncPageNotice(null);
    setSyncPageError(null);
    try {
      const response = await fetchWithAuth("/api/admin/trr-api/brands/logos/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          scope: "page",
          page: "shows",
          target_types: ["franchise", "show"],
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
        throw new Error(payload.error || "Failed to sync show/franchise logos");
      }
      setSyncPageNotice(
        `Scanned ${Number(payload.targets_scanned ?? 0)} targets, imported ${
          Number(payload.imports_created ?? 0) + Number(payload.imports_updated ?? 0)
        }, unresolved ${Number(payload.unresolved ?? 0)}.`,
      );
      await refreshAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to sync show/franchise logos";
      setSyncPageError(message);
    } finally {
      setSyncingPageLogos(false);
    }
  }, [fetchWithAuth, refreshAll]);

  useEffect(() => {
    if (checking || !user || !hasAccess || !SHOWS_FRANCHISES_ENABLED) return;
    void refreshAll();
  }, [checking, hasAccess, refreshAll, user]);

  const onSubmitShowSearch = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setShowQuery(showQueryDraft);
    },
    [showQueryDraft],
  );

  const showCards = useMemo(() => {
    const map = new Map<string, LogoCard>();
    for (const row of rows) {
      if (!row.show_id) continue;
      if (!map.has(row.show_id)) {
        map.set(row.show_id, {
          targetType: "show",
          targetKey: row.show_id,
          targetLabel: row.show_name,
          subtitle: row.franchise_name ? `Franchise: ${row.franchise_name}` : "No franchise",
          wordmarkUrl: null,
          iconUrl: null,
          assetCount: 0,
          sourceProvider: null,
        });
      }
    }
    for (const row of showLogoRows) {
      const key = String(row.target_key || "").trim();
      if (!key) continue;
      const card =
        map.get(key) ??
        {
          targetType: "show" as const,
          targetKey: key,
          targetLabel: row.target_label || key,
          subtitle: null,
          wordmarkUrl: null,
          iconUrl: null,
          assetCount: 0,
          sourceProvider: null,
        };
      updateCardFromLogoRow(card, row);
      map.set(key, card);
    }
    return [...map.values()].sort((a, b) => a.targetLabel.localeCompare(b.targetLabel));
  }, [rows, showLogoRows]);

  const franchiseCards = useMemo(() => {
    const map = new Map<string, LogoCard>();
    const franchiseShowCounts = new Map<string, number>();
    for (const row of rows) {
      const key = String(row.franchise_key || "").trim();
      if (!key || key === "unassigned") continue;
      franchiseShowCounts.set(key, (franchiseShowCounts.get(key) ?? 0) + 1);
      if (!map.has(key)) {
        map.set(key, {
          targetType: "franchise",
          targetKey: key,
          targetLabel: row.franchise_name || key,
          subtitle: null,
          wordmarkUrl: null,
          iconUrl: null,
          assetCount: 0,
          sourceProvider: null,
        });
      }
    }
    for (const row of franchiseLogoRows) {
      const key = String(row.target_key || "").trim();
      if (!key) continue;
      const card =
        map.get(key) ??
        {
          targetType: "franchise" as const,
          targetKey: key,
          targetLabel: row.target_label || key,
          subtitle: null,
          wordmarkUrl: null,
          iconUrl: null,
          assetCount: 0,
          sourceProvider: null,
        };
      updateCardFromLogoRow(card, row);
      map.set(key, card);
    }
    return [...map.values()]
      .map((card) => ({
        ...card,
        subtitle: `${franchiseShowCounts.get(card.targetKey) ?? 0} show${
          franchiseShowCounts.get(card.targetKey) === 1 ? "" : "s"
        }`,
      }))
      .sort((a, b) => a.targetLabel.localeCompare(b.targetLabel));
  }, [franchiseLogoRows, rows]);

  const showCompleteCount = useMemo(
    () => showCards.filter((card) => getCardStatus(card) === "complete").length,
    [showCards],
  );
  const franchiseCompleteCount = useMemo(
    () => franchiseCards.filter((card) => getCardStatus(card) === "complete").length,
    [franchiseCards],
  );

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Preparing show branding workspace...</p>
        </div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return null;
  }

  if (!SHOWS_FRANCHISES_ENABLED) {
    return (
      <ClientOnly>
        <div className="min-h-screen bg-zinc-50">
          <AdminGlobalHeader bodyClassName="px-6 py-6">
            <div className="mx-auto max-w-6xl">
              <AdminBreadcrumbs
                items={buildBrandsPageBreadcrumb("Show Branding", "/brands/shows-and-franchises")}
                className="mb-1"
              />
              <h1 className="break-words text-3xl font-bold text-zinc-900">Show Branding</h1>
              <p className="break-words text-sm text-zinc-500">
                This page is currently disabled. Enable `BRANDS_SHOWS_FRANCHISES_ENABLED` to use it.
              </p>
              <BrandsTabs activeTab="shows" className="mt-4" />
            </div>
          </AdminGlobalHeader>
        </div>
      </ClientOnly>
    );
  }

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        <AdminGlobalHeader bodyClassName="px-6 py-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <AdminBreadcrumbs
                items={buildBrandsPageBreadcrumb("Show Branding", "/brands/shows-and-franchises")}
                className="mb-1"
              />
              <h1 className="break-words text-3xl font-bold text-zinc-900">
                Show & Franchise Branding
              </h1>
              <p className="break-words text-sm text-zinc-500">
                Manage logo assets for shows and franchise brands. Shared link rules and franchise
                automation now live in Shows Settings.
              </p>
              <BrandsTabs activeTab="shows" className="mt-4" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void syncShowsPageLogos()}
                disabled={syncingPageLogos}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
              >
                {syncingPageLogos ? "Syncing..." : "Sync Show/Franchise Logos"}
              </button>
              <button
                type="button"
                onClick={() => void refreshAll()}
                disabled={rowsLoading || showLogoLoading || franchiseLogoLoading || syncingPageLogos}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {rowsLoading || showLogoLoading || franchiseLogoLoading ? "Refreshing..." : "Refresh"}
              </button>
              <Link
                href="/shows/settings"
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Open Shows Settings
              </Link>
              <Link
                href="/admin"
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Back to Admin
              </Link>
            </div>
          </div>
        </AdminGlobalHeader>

        <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
          {rowsError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {rowsError}
            </div>
          ) : null}
          {showLogoError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {showLogoError}
            </div>
          ) : null}
          {franchiseLogoError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {franchiseLogoError}
            </div>
          ) : null}
          {syncPageError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {syncPageError}
            </div>
          ) : null}
          {syncPageNotice ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {syncPageNotice}
            </div>
          ) : null}

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
              Branding Overview
            </p>
            <h2 className="mt-2 text-2xl font-bold text-zinc-900">Coverage Snapshot</h2>
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-zinc-700">
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5">
                shows: {showCards.length}
              </span>
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5">
                complete shows: {showCompleteCount}
              </span>
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5">
                franchises: {franchiseCards.length}
              </span>
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5">
                complete franchises: {franchiseCompleteCount}
              </span>
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5">
                shows in scope: {rowsCount}
              </span>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900">Find Show Branding Targets</h2>
                <p className="text-sm text-zinc-500">
                  Filter show and franchise cards by show title.
                </p>
              </div>
            </div>
            <form onSubmit={onSubmitShowSearch} className="flex flex-wrap items-center gap-2">
              <input
                value={showQueryDraft}
                onChange={(event) => setShowQueryDraft(event.target.value)}
                placeholder="Search show name..."
                className="min-w-[260px] rounded border border-zinc-300 px-3 py-1.5 text-sm"
              />
              <button
                type="submit"
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowQueryDraft("");
                  setShowQuery("");
                }}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Clear
              </button>
            </form>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-zinc-900">
                Shows ({showCards.length})
              </h2>
              <p className="text-sm text-zinc-500">Complete: {showCompleteCount}</p>
            </div>
            {showCards.length === 0 ? (
              <p className="text-sm text-zinc-500">No show branding targets found for this filter.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {showCards.map((card) => (
                  <article
                    key={`${card.targetType}:${card.targetKey}`}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer rounded border border-zinc-200 p-3 transition hover:border-zinc-300 hover:bg-zinc-50"
                    onClick={() =>
                      setLogoPickerState({
                        targetType: card.targetType,
                        targetKey: card.targetKey,
                        targetLabel: card.targetLabel,
                      })
                    }
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      setLogoPickerState({
                        targetType: card.targetType,
                        targetKey: card.targetKey,
                        targetLabel: card.targetLabel,
                      });
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-900">{card.targetLabel}</p>
                        {card.subtitle ? (
                          <p className="truncate text-xs text-zinc-500">{card.subtitle}</p>
                        ) : null}
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                          getCardStatus(card) === "complete"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {getCardStatus(card) === "complete" ? "Complete" : "Needs attention"}
                      </span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <div className="relative h-12 w-28 overflow-hidden rounded border border-zinc-200 bg-zinc-50">
                        <Image
                          src={card.wordmarkUrl || PLACEHOLDER_ICON_PATH}
                          alt={
                            card.wordmarkUrl
                              ? `${card.targetLabel} wordmark`
                              : `${card.targetLabel} placeholder`
                          }
                          fill
                          className="object-contain p-1"
                          unoptimized
                        />
                      </div>
                      <div className="relative h-12 w-12 overflow-hidden rounded border border-zinc-200 bg-zinc-50">
                        <Image
                          src={card.iconUrl || PLACEHOLDER_ICON_PATH}
                          alt={
                            card.iconUrl
                              ? `${card.targetLabel} icon`
                              : `${card.targetLabel} placeholder icon`
                          }
                          fill
                          className="object-contain p-1"
                          unoptimized
                        />
                      </div>
                    </div>
                    <div className="mt-2 space-y-1">
                      {card.sourceProvider ? (
                        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                          {normalizeProviderLabel(card.sourceProvider)}
                        </p>
                      ) : null}
                      <p className="text-xs text-zinc-500">
                        Wordmark: {card.wordmarkUrl ? "available" : "missing"} · Icon:{" "}
                        {card.iconUrl ? "available" : "missing"} · Assets: {card.assetCount}
                      </p>
                    </div>
                    {getCardStatus(card) !== "complete" ? (
                      <p className="mt-1 text-xs text-amber-700">
                        Missing{" "}
                        {card.wordmarkUrl
                          ? "icon"
                          : card.iconUrl
                            ? "wordmark"
                            : "wordmark + icon"}
                        .
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-zinc-900">
                Franchises ({franchiseCards.length})
              </h2>
              <p className="text-sm text-zinc-500">Complete: {franchiseCompleteCount}</p>
            </div>
            {franchiseCards.length === 0 ? (
              <p className="text-sm text-zinc-500">No franchise branding targets found for this filter.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {franchiseCards.map((card) => (
                  <article
                    key={`${card.targetType}:${card.targetKey}`}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer rounded border border-zinc-200 p-3 transition hover:border-zinc-300 hover:bg-zinc-50"
                    onClick={() =>
                      setLogoPickerState({
                        targetType: card.targetType,
                        targetKey: card.targetKey,
                        targetLabel: card.targetLabel,
                      })
                    }
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      setLogoPickerState({
                        targetType: card.targetType,
                        targetKey: card.targetKey,
                        targetLabel: card.targetLabel,
                      });
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-900">{card.targetLabel}</p>
                        {card.subtitle ? (
                          <p className="truncate text-xs text-zinc-500">{card.subtitle}</p>
                        ) : null}
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                          getCardStatus(card) === "complete"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {getCardStatus(card) === "complete" ? "Complete" : "Needs attention"}
                      </span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <div className="relative h-12 w-28 overflow-hidden rounded border border-zinc-200 bg-zinc-50">
                        <Image
                          src={card.wordmarkUrl || PLACEHOLDER_ICON_PATH}
                          alt={
                            card.wordmarkUrl
                              ? `${card.targetLabel} wordmark`
                              : `${card.targetLabel} placeholder`
                          }
                          fill
                          className="object-contain p-1"
                          unoptimized
                        />
                      </div>
                      <div className="relative h-12 w-12 overflow-hidden rounded border border-zinc-200 bg-zinc-50">
                        <Image
                          src={card.iconUrl || PLACEHOLDER_ICON_PATH}
                          alt={
                            card.iconUrl
                              ? `${card.targetLabel} icon`
                              : `${card.targetLabel} placeholder icon`
                          }
                          fill
                          className="object-contain p-1"
                          unoptimized
                        />
                      </div>
                    </div>
                    <div className="mt-2 space-y-1">
                      {card.sourceProvider ? (
                        <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                          {normalizeProviderLabel(card.sourceProvider)}
                        </p>
                      ) : null}
                      <p className="text-xs text-zinc-500">
                        Wordmark: {card.wordmarkUrl ? "available" : "missing"} · Icon:{" "}
                        {card.iconUrl ? "available" : "missing"} · Assets: {card.assetCount}
                      </p>
                    </div>
                    {getCardStatus(card) !== "complete" ? (
                      <p className="mt-1 text-xs text-amber-700">
                        Missing{" "}
                        {card.wordmarkUrl
                          ? "icon"
                          : card.iconUrl
                            ? "wordmark"
                            : "wordmark + icon"}
                        .
                      </p>
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
            onSaved={refreshAll}
          />
        ) : null}
      </div>
    </ClientOnly>
  );
}
