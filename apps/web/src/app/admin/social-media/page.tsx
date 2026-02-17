"use client";

import { Route } from "next";
import Link from "next/link";
import ClientOnly from "@/components/ClientOnly";
import RedditSourcesManager from "@/components/admin/reddit-sources-manager";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

export default function AdminSocialMediaPage() {
  const { user, checking, hasAccess } = useAdminGuard();

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
    return null;
  }

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        <header className="border-b border-zinc-200 bg-white px-6 py-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Admin / Social Intelligence</p>
              <h1 className="text-3xl font-bold text-zinc-900">Social Analytics</h1>
              <p className="text-sm text-zinc-500">Category dashboards for Bravo Content and Creator Content.</p>
            </div>
            <Link
              href="/admin"
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              Back to Admin
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
          <section className="grid gap-4 md:grid-cols-2">
            <Link
              href={"/admin/social-media/bravo-content" as Route}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">Category</p>
              <h2 className="mt-2 text-2xl font-bold text-zinc-900">Bravo Content</h2>
              <p className="mt-2 text-sm text-zinc-600">
                Official network channels and accounts (BravoTV, BravoDailyDish, BravoWWHL, WWHL).
              </p>
              <p className="mt-4 text-sm font-semibold text-zinc-900">Open Dashboard</p>
            </Link>

            <Link
              href={"/admin/social-media/creator-content" as Route}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">Category</p>
              <div className="mt-2 flex items-center gap-2">
                <h2 className="text-2xl font-bold text-zinc-900">Creator Content</h2>
                <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-600">
                  Read-only
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-600">
                Per-show creator roster dashboard shell. Actions and ingest controls are intentionally disabled for now.
              </p>
              <p className="mt-4 text-sm font-semibold text-zinc-900">Open Dashboard</p>
            </Link>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">Season Ops</p>
                <h3 className="text-lg font-semibold text-zinc-900">Operational Ingest Surface</h3>
              </div>
              <Link
                href="/admin/trr-shows"
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Open Shows
              </Link>
            </div>
            <p className="text-sm text-zinc-600">
              Season-level ingest, jobs, and exports continue under each show season Social tab.
            </p>
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">Community Sources</p>
              <h3 className="text-lg font-semibold text-zinc-900">Reddit Source Manager</h3>
            </div>
            <RedditSourcesManager mode="global" />
          </section>
        </main>
      </div>
    </ClientOnly>
  );
}
