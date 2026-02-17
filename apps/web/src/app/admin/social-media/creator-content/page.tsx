"use client";

import Link from "next/link";
import ClientOnly from "@/components/ClientOnly";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

export default function CreatorContentDashboardPage() {
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
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Admin / Social Analytics</p>
              <h1 className="text-3xl font-bold text-zinc-900">Creator Content</h1>
              <p className="text-sm text-zinc-500">
                Dashboard shell created. This category is intentionally read-only for now.
              </p>
            </div>
            <Link
              href="/admin/social-media"
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              Back
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-700">Read-only</p>
            <h2 className="mt-2 text-xl font-semibold text-amber-900">Creator ingest/actions are disabled</h2>
            <p className="mt-2 text-sm text-amber-800">
              The page exists for information architecture and navigation continuity while roster workflows are finalized.
            </p>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              "Overview",
              "Per-Show Roster",
              "Episode Comparison",
              "Cast Sentiment",
              "Hashtag Analysis",
              "Ops History",
            ].map((section) => (
              <article key={section} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Section</p>
                <h3 className="mt-2 text-lg font-semibold text-zinc-900">{section}</h3>
                <p className="mt-2 text-sm text-zinc-600">Planned section. No write actions are enabled yet.</p>
              </article>
            ))}
          </section>
        </main>
      </div>
    </ClientOnly>
  );
}
