"use client";

import { useEffect, useMemo, useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import { buildAdminSectionBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { buildShowAdminUrl, buildSocialAccountProfileUrl } from "@/lib/admin/show-admin-routes";
import { resolvePreferredShowRouteSlug } from "@/lib/admin/show-route-slug";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

interface CoveredShow {
  id: string;
  trr_show_id: string;
  show_name: string;
  canonical_slug?: string | null;
  alternative_names?: string[] | null;
  show_total_episodes?: number | null;
}

interface SharedAccountSource {
  id: string;
  platform: string;
  source_scope: string;
  account_handle: string;
  is_active: boolean;
  scrape_priority: number;
  last_scrape_status?: string | null;
  last_scrape_at?: string | null;
  last_classified_at?: string | null;
}

interface SharedRun {
  id: string;
  status: string;
  created_at?: string | null;
  completed_at?: string | null;
  ingest_mode?: string | null;
}

interface SharedReviewItem {
  id: string;
  platform: string;
  source_id: string;
  source_account?: string | null;
  review_reason: string;
  review_status: string;
}

export default function AdminSocialMediaPage() {
  const { user, checking, hasAccess } = useAdminGuard();
  const [shows, setShows] = useState<CoveredShow[]>([]);
  const [loadingShows, setLoadingShows] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sharedSources, setSharedSources] = useState<SharedAccountSource[]>([]);
  const [sharedRuns, setSharedRuns] = useState<SharedRun[]>([]);
  const [sharedReviewItems, setSharedReviewItems] = useState<SharedReviewItem[]>([]);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [sharedError, setSharedError] = useState<string | null>(null);
  const [sharedActionState, setSharedActionState] = useState<string | null>(null);

  useEffect(() => {
    if (checking || !user || !hasAccess) return;

    let cancelled = false;
    const loadShows = async () => {
      setLoadingShows(true);
      setLoadError(null);
      try {
        const response = await fetchAdminWithAuth("/api/admin/covered-shows", undefined, {
          preferredUser: user,
        });
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
          shows?: CoveredShow[];
        };
        if (!response.ok) {
          throw new Error(data.error || "Failed to load covered shows");
        }
        if (cancelled) return;
        setShows(Array.isArray(data.shows) ? data.shows : []);
      } catch (error) {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : "Failed to load covered shows");
      } finally {
        if (!cancelled) {
          setLoadingShows(false);
        }
      }
    };

    void loadShows();
    return () => {
      cancelled = true;
    };
  }, [checking, hasAccess, user]);

  useEffect(() => {
    if (checking || !user || !hasAccess) return;
    let cancelled = false;

    const loadSharedState = async () => {
      setSharedLoading(true);
      setSharedError(null);
      try {
        const [sourcesResponse, runsResponse, reviewResponse] = await Promise.all([
          fetchAdminWithAuth("/api/admin/trr-api/social/shared/sources?source_scope=bravo&include_inactive=true", undefined, {
            preferredUser: user,
          }),
          fetchAdminWithAuth("/api/admin/trr-api/social/shared/runs?source_scope=bravo&limit=5", undefined, {
            preferredUser: user,
          }),
          fetchAdminWithAuth("/api/admin/trr-api/social/shared/review-queue?source_scope=bravo&review_status=open&limit=10", undefined, {
            preferredUser: user,
          }),
        ]);

        const [sourcesData, runsData, reviewData] = await Promise.all([
          sourcesResponse.json().catch(() => ({})),
          runsResponse.json().catch(() => ([])),
          reviewResponse.json().catch(() => ({})),
        ]);

        if (!sourcesResponse.ok) {
          throw new Error((sourcesData as { error?: string }).error || "Failed to load shared account sources");
        }
        if (!runsResponse.ok) {
          throw new Error((runsData as { error?: string }).error || "Failed to load shared ingest runs");
        }
        if (!reviewResponse.ok) {
          throw new Error((reviewData as { error?: string }).error || "Failed to load shared review queue");
        }
        if (cancelled) return;
        setSharedSources(Array.isArray((sourcesData as { sources?: SharedAccountSource[] }).sources) ? (sourcesData as { sources?: SharedAccountSource[] }).sources ?? [] : []);
        setSharedRuns(Array.isArray(runsData) ? (runsData as SharedRun[]) : []);
        setSharedReviewItems(Array.isArray((reviewData as { items?: SharedReviewItem[] }).items) ? (reviewData as { items?: SharedReviewItem[] }).items ?? [] : []);
      } catch (error) {
        if (cancelled) return;
        setSharedError(error instanceof Error ? error.message : "Failed to load shared social pipeline state");
      } finally {
        if (!cancelled) {
          setSharedLoading(false);
        }
      }
    };

    void loadSharedState();
    return () => {
      cancelled = true;
    };
  }, [checking, hasAccess, user]);

  const sortedShows = useMemo(
    () =>
      [...shows].sort((a, b) => {
        const aName = (a.show_name ?? "").trim().toLowerCase();
        const bName = (b.show_name ?? "").trim().toLowerCase();
        return aName.localeCompare(bName);
      }),
    [shows],
  );

  const runSharedIngest = async () => {
    if (!user) return;
    setSharedActionState("Running shared ingest…");
    try {
      const response = await fetchAdminWithAuth(
        "/api/admin/trr-api/social/shared/ingest",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source_scope: "bravo" }),
        },
        { preferredUser: user },
      );
      const data = (await response.json().catch(() => ({}))) as { error?: string; run_id?: string; message?: string };
      if (!response.ok) {
        throw new Error(data.error || "Failed to start shared ingest");
      }
      setSharedActionState(data.message || (data.run_id ? `Queued run ${data.run_id}` : "Shared ingest queued"));
    } catch (error) {
      setSharedActionState(error instanceof Error ? error.message : "Failed to start shared ingest");
    }
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return "Never";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString();
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Loading admin access…</p>
        </div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
        <div className="w-full max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-700">Access Required</p>
          <h1 className="mt-2 text-xl font-bold">Admin access is required</h1>
          <p className="mt-2 text-sm text-amber-800">
            You are signed in but do not have permission to view Social Analytics.
          </p>
          <div className="mt-4">
            <Link
              href="/admin"
              className="inline-flex rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
            >
              Back to Admin
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        <AdminGlobalHeader bodyClassName="px-6 py-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <AdminBreadcrumbs items={buildAdminSectionBreadcrumb("Social Analytics", "/admin/social")} className="mb-1" />
              <h1 className="text-3xl font-bold text-zinc-900">Social Analytics</h1>
              <p className="text-sm text-zinc-500">Select a covered show to open Bravo social analytics.</p>
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
          <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">Shared Ingest</p>
                <h2 className="text-lg font-semibold text-zinc-900">Bravo-owned account pipeline</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Shared account scraping is the production path. Season targets are now classification rules; the legacy season-targeted scrape path is retained only for rollback/debug.
                </p>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <button
                  type="button"
                  onClick={() => {
                    void runSharedIngest();
                  }}
                  className="rounded-lg border border-zinc-900 bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  Run Shared Ingest
                </button>
                {sharedActionState ? <p className="text-xs text-zinc-500">{sharedActionState}</p> : null}
              </div>
            </div>

            {sharedLoading ? (
              <div className="mt-6 text-sm text-zinc-500">Loading shared social pipeline state…</div>
            ) : sharedError ? (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{sharedError}</div>
            ) : (
              <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Shared Sources</p>
                      <h3 className="text-sm font-semibold text-zinc-900">Active account inventory</h3>
                    </div>
                    <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600">
                      {sharedSources.length} rows
                    </span>
                  </div>
                  <div className="space-y-2">
                    {sharedSources.length === 0 ? (
                      <p className="text-sm text-zinc-500">No shared sources configured.</p>
                    ) : (
                      sharedSources.map((source) => (
                        <div
                          key={source.id}
                          className="grid gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-700 sm:grid-cols-[120px_1fr_auto]"
                        >
                          <div className="font-semibold capitalize text-zinc-900">{source.platform}</div>
                          <div>
                            <Link
                              href={buildSocialAccountProfileUrl({
                                platform: source.platform,
                                handle: source.account_handle,
                              }) as Route}
                              className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              @{source.account_handle}
                            </Link>
                            <p className="text-xs text-zinc-500">
                              Priority {source.scrape_priority} · {source.is_active ? "Active" : "Archived"}
                            </p>
                          </div>
                          <div className="text-xs text-zinc-500 sm:text-right">
                            <p>Scrape: {source.last_scrape_status || "Not run"}</p>
                            <p>Last scrape: {formatDateTime(source.last_scrape_at)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Recent Runs</p>
                    <div className="mt-3 space-y-2">
                      {sharedRuns.length === 0 ? (
                        <p className="text-sm text-zinc-500">No shared ingest runs yet.</p>
                      ) : (
                        sharedRuns.map((run) => (
                          <div key={run.id} className="rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold text-zinc-900">{run.status}</span>
                              <span className="text-xs text-zinc-500">{run.ingest_mode || "shared_account_async"}</span>
                            </div>
                            <p className="mt-1 text-xs text-zinc-500">Started {formatDateTime(run.created_at)}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Review Queue</p>
                        <h3 className="text-sm font-semibold text-zinc-900">Ambiguous or unmatched posts</h3>
                      </div>
                      <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600">
                        {sharedReviewItems.length} open
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {sharedReviewItems.length === 0 ? (
                        <p className="text-sm text-zinc-500">No open shared review items.</p>
                      ) : (
                        sharedReviewItems.map((item) => (
                          <div key={item.id} className="rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-700">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold capitalize text-zinc-900">{item.platform}</span>
                              <span className="text-xs uppercase tracking-[0.14em] text-amber-700">{item.review_reason.replace(/_/g, " ")}</span>
                            </div>
                            <p className="mt-1 text-xs text-zinc-500">
                              @{item.source_account || "unknown"} · {item.source_id}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">Covered Shows</p>
                <h2 className="text-lg font-semibold text-zinc-900">Choose a show</h2>
              </div>
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-semibold text-zinc-600">
                {sortedShows.length} total
              </span>
            </div>

            {loadingShows ? (
              <div className="py-10 text-center text-sm text-zinc-500">Loading covered shows…</div>
            ) : loadError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {loadError}
              </div>
            ) : sortedShows.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No covered shows found. Add shows in the Shows admin page first.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sortedShows.map((show) => {
                  const routeSlug = resolvePreferredShowRouteSlug({
                    alternativeNames: show.alternative_names,
                    canonicalSlug: show.canonical_slug,
                    fallback: show.show_name || show.trr_show_id,
                  });
                  const socialHref = buildShowAdminUrl({
                    showSlug: routeSlug,
                    tab: "social",
                    socialView: "official",
                  }) as Route;
                  return (
                    <Link
                      key={show.id}
                      href={socialHref}
                      className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 transition hover:border-zinc-300 hover:bg-zinc-100"
                    >
                      <p className="text-sm font-semibold text-zinc-900">{show.show_name}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                        Open Official Analytics
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>
    </ClientOnly>
  );
}
