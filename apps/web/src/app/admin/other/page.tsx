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

interface BrandLogoRow {
  id: string;
  target_type: string;
  target_key: string;
  target_label: string;
  source_url: string | null;
  source_domain?: string | null;
  source_provider?: string | null;
  discovered_from?: string | null;
  logo_role?: string | null;
  hosted_logo_url: string | null;
  hosted_logo_black_url: string | null;
  hosted_logo_white_url: string | null;
  is_primary?: boolean;
  is_selected_for_role?: boolean;
  updated_at: string | null;
}

interface BrandLogoCard {
  id: string;
  target_type: string;
  target_key: string;
  target_label: string;
  source_provider: string | null;
  discovered_from: string | null;
  wordmark_url: string | null;
  icon_url: string | null;
}

type LogoPickerState = {
  targetType: "other";
  targetKey: string;
  targetLabel: string;
};

const PLACEHOLDER_ICON_PATH = "/icons/brand-placeholder.svg";

export default function AdminOtherBrandsPage() {
  const { user, checking, hasAccess } = useAdminGuard();
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<BrandLogoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [logoPickerState, setLogoPickerState] = useState<LogoPickerState | null>(null);

  const fetchWithAuth = useCallback(
    (input: RequestInfo | URL, init?: RequestInit) =>
      fetchAdminWithAuth(input, init, {
        preferredUser: user,
        allowDevAdminBypass: true,
      }),
    [user]
  );

  const loadLogos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pageSize = 500;
      const merged: BrandLogoRow[] = [];
      let offset = 0;
      let totalCount = Number.POSITIVE_INFINITY;
      while (offset < totalCount) {
        const response = await fetchWithAuth(
          `/api/admin/trr-api/brands/logos?target_type=other&q=${encodeURIComponent(query)}&limit=${pageSize}&offset=${offset}&include_missing=true`,
          { cache: "no-store" }
        );
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error || "Failed to load other logos");
        }
        const payload = (await response.json().catch(() => ({}))) as { rows?: BrandLogoRow[]; count?: number };
        const rows = Array.isArray(payload.rows) ? payload.rows : [];
        merged.push(...rows);
        totalCount = Number(payload.count ?? rows.length);
        if (rows.length < pageSize) break;
        offset += rows.length;
      }
      setRows(merged);
    } catch (loadError) {
      setRows([]);
      setError(loadError instanceof Error ? loadError.message : "Failed to load logos");
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, query]);

  const syncOtherPageLogos = useCallback(async () => {
    setSyncing(true);
    setSyncNotice(null);
    setSyncError(null);
    try {
      const response = await fetchWithAuth("/api/admin/trr-api/brands/logos/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "page",
          page: "other",
          target_types: ["other"],
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
        throw new Error(payload.error || "Failed to sync other brand logos");
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
    if (checking || !user || !hasAccess) return;
    void loadLogos();
  }, [checking, hasAccess, loadLogos, user]);

  const cards = useMemo<BrandLogoCard[]>(() => {
    const grouped = new Map<string, BrandLogoCard>();
    const chooseHostedUrl = (row: BrandLogoRow): string | null =>
      row.hosted_logo_url || row.hosted_logo_black_url || row.hosted_logo_white_url || null;

    for (const row of rows) {
      const key = `${row.target_type}:${row.target_key}`;
      const role = String(row.logo_role || "").trim().toLowerCase();
      const hostedUrl = chooseHostedUrl(row);
      const current = grouped.get(key) ?? {
        id: row.id || key,
        target_type: row.target_type,
        target_key: row.target_key,
        target_label: row.target_label || row.target_key,
        source_provider: row.source_provider ?? null,
        discovered_from: row.discovered_from ?? null,
        wordmark_url: null,
        icon_url: null,
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
      if (!current.source_provider && row.source_provider) current.source_provider = row.source_provider;
      if (!current.discovered_from && row.discovered_from) current.discovered_from = row.discovered_from;
      grouped.set(key, current);
    }

    return [...grouped.values()].sort((a, b) => a.target_label.localeCompare(b.target_label));
  }, [rows]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Preparing other brands workspace...</p>
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
              <AdminBreadcrumbs items={buildBrandsPageBreadcrumb("Other", "/brands/other")} className="mb-1" />
              <h1 className="break-words text-3xl font-bold text-zinc-900">Other Brands</h1>
              <p className="break-words text-sm text-zinc-500">Catch-all bucket for brand entities outside core categories.</p>
              <BrandsTabs activeTab="other" className="mt-4" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void syncOtherPageLogos()}
                disabled={syncing}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
              >
                {syncing ? "Syncing..." : "Sync Other Brand Logos"}
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
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search other brand logos..."
                className="min-w-[280px] flex-1 rounded border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void loadLogos()}
                disabled={loading}
                className="rounded border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>
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

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-zinc-900">Other Logos ({cards.length})</h2>
            </div>
            {cards.length === 0 ? (
              <p className="text-sm text-zinc-500">No logos found for this filter.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cards.map((row) => (
                  <article
                    key={row.id}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer rounded border border-zinc-200 p-3 transition hover:border-zinc-300 hover:bg-zinc-50"
                    onClick={() =>
                      setLogoPickerState({
                        targetType: "other",
                        targetKey: row.target_key,
                        targetLabel: row.target_label,
                      })
                    }
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      setLogoPickerState({
                        targetType: "other",
                        targetKey: row.target_key,
                        targetLabel: row.target_label,
                      });
                    }}
                  >
                    <p className="truncate text-sm font-semibold text-zinc-900">{row.target_label}</p>
                    <p className="truncate text-xs text-zinc-500">{row.target_key}</p>
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
                    {row.source_provider ? (
                      <p className="mt-2 truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">
                        {row.source_provider}
                      </p>
                    ) : null}
                    {!row.wordmark_url || !row.icon_url ? (
                      <p className="mt-1 text-xs text-amber-700">
                        Missing {row.wordmark_url ? "icon" : row.icon_url ? "wordmark" : "wordmark + icon"}.
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
            onSaved={loadLogos}
          />
        ) : null}
      </div>
    </ClientOnly>
  );
}
