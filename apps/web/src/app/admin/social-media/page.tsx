"use client";

import { useEffect, useMemo, useState } from "react";
import type { Route } from "next";
import Link from "next/link";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import { buildAdminSectionBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { buildShowAdminUrl } from "@/lib/admin/show-admin-routes";
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

export default function AdminSocialMediaPage() {
  const { user, checking, hasAccess } = useAdminGuard();
  const [shows, setShows] = useState<CoveredShow[]>([]);
  const [loadingShows, setLoadingShows] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  const sortedShows = useMemo(
    () =>
      [...shows].sort((a, b) => {
        const aName = (a.show_name ?? "").trim().toLowerCase();
        const bName = (b.show_name ?? "").trim().toLowerCase();
        return aName.localeCompare(bName);
      }),
    [shows],
  );

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
              <AdminBreadcrumbs items={buildAdminSectionBreadcrumb("Social Analytics", "/admin/social-media")} className="mb-1" />
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
