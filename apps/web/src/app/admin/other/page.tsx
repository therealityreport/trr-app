"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import ClientOnly from "@/components/ClientOnly";
import BrandsTabs from "@/components/admin/BrandsTabs";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import { buildBrandsPageBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

interface BrandLogoRow {
  id: string;
  target_type: string;
  target_key: string;
  target_label: string;
  hosted_logo_url: string | null;
  hosted_logo_black_url: string | null;
  hosted_logo_white_url: string | null;
  updated_at: string | null;
}

export default function AdminOtherBrandsPage() {
  const { user, checking, hasAccess } = useAdminGuard();
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<BrandLogoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWithAuth = useCallback(
    (input: RequestInfo | URL, init?: RequestInit) =>
      fetchAdminWithAuth(input, init, {
        preferredUser: user,
      }),
    [user]
  );

  const loadLogos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchWithAuth(
        `/api/admin/trr-api/brands/logos?target_type=other&q=${encodeURIComponent(query)}&limit=300`,
        { cache: "no-store" }
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "Failed to load other logos");
      }
      const payload = (await response.json().catch(() => ({}))) as { rows?: BrandLogoRow[] };
      setRows(Array.isArray(payload.rows) ? payload.rows : []);
    } catch (loadError) {
      setRows([]);
      setError(loadError instanceof Error ? loadError.message : "Failed to load logos");
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, query]);

  useEffect(() => {
    if (checking || !user || !hasAccess) return;
    void loadLogos();
  }, [checking, hasAccess, loadLogos, user]);

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
            <Link
              href="/admin"
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              Back to Admin
            </Link>
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
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-zinc-900">Other Logos ({rows.length})</h2>
            </div>
            {rows.length === 0 ? (
              <p className="text-sm text-zinc-500">No logos found for this filter.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map((row) => (
                  <article key={row.id} className="rounded border border-zinc-200 p-3">
                    <p className="truncate text-sm font-semibold text-zinc-900">{row.target_label}</p>
                    <p className="truncate text-xs text-zinc-500">{row.target_key}</p>
                    <div className="mt-2 flex gap-2">
                      {row.hosted_logo_url ? (
                        <div className="relative h-12 w-24 overflow-hidden rounded border border-zinc-200 bg-zinc-50">
                          <Image src={row.hosted_logo_url} alt={row.target_label} fill className="object-contain p-1" unoptimized />
                        </div>
                      ) : null}
                      {row.hosted_logo_black_url ? (
                        <div className="relative h-12 w-24 overflow-hidden rounded border border-zinc-200 bg-white">
                          <Image src={row.hosted_logo_black_url} alt={`${row.target_label} black`} fill className="object-contain p-1" unoptimized />
                        </div>
                      ) : null}
                      {row.hosted_logo_white_url ? (
                        <div className="relative h-12 w-24 overflow-hidden rounded border border-zinc-200 bg-zinc-900">
                          <Image src={row.hosted_logo_white_url} alt={`${row.target_label} white`} fill className="object-contain p-1" unoptimized />
                        </div>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </ClientOnly>
  );
}
