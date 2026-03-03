"use client";

import Link from "next/link";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import { buildAdminSectionBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { ADMIN_GAMES } from "@/lib/admin/games";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

export default function AdminGamesPage() {
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
        <AdminGlobalHeader bodyClassName="px-6 py-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <AdminBreadcrumbs items={buildAdminSectionBreadcrumb("Games", "/admin/games")} className="mb-1" />
              <h1 className="text-3xl font-bold text-zinc-900">Games</h1>
              <p className="text-sm text-zinc-500">Game content, configuration, and publishing tools.</p>
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
          <section>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Live Games</p>
            <h2 className="mt-2 text-2xl font-bold text-zinc-900">Select a game to manage</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Open each game admin panel for live links, diagnostics context, and recent player reports.
            </p>
          </section>

          <section className="mt-6 grid gap-6 md:grid-cols-2">
            {ADMIN_GAMES.map((game) => (
              <article key={game.key} className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">{game.subtitle}</p>
                    <h3 className="mt-1 text-2xl font-bold text-zinc-900">{game.title}</h3>
                  </div>
                  <span className={`h-4 w-4 rounded-full ${game.accentClassName}`} aria-hidden="true" />
                </div>
                <p className="mt-3 text-sm text-zinc-600">{game.description}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href={game.adminHref}
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-700"
                  >
                    Open Admin
                  </Link>
                  <Link
                    href={game.playHref}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                  >
                    Open Live Game
                  </Link>
                </div>
              </article>
            ))}
          </section>
        </main>
      </div>
    </ClientOnly>
  );
}
