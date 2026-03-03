"use client";

import Link from "next/link";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import GameProblemReports from "@/components/admin/GameProblemReports";
import { ADMIN_GAME_MAP } from "@/lib/admin/games";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

const GAME = ADMIN_GAME_MAP.realitease;

export default function AdminRealiteasePage() {
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
              <AdminBreadcrumbs
                items={[
                  { label: "Admin", href: "/admin" },
                  { label: "Games", href: "/admin/games" },
                  { label: GAME.title, href: GAME.adminHref },
                ]}
                className="mb-1"
              />
              <h1 className="text-3xl font-bold text-zinc-900">{GAME.title}</h1>
              <p className="text-sm text-zinc-500">{GAME.subtitle}</p>
            </div>
            <Link
              href="/admin/games"
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              Back to Games
            </Link>
          </div>
        </AdminGlobalHeader>

        <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">Live Links</p>
            <h2 className="mt-1 text-xl font-bold text-zinc-900">Open Realitease surfaces</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={GAME.coverHref}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Cover
              </Link>
              <Link
                href={GAME.playHref}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Play
              </Link>
              <a
                href={GAME.statsHref}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Stats
              </a>
            </div>
          </section>

          <GameProblemReports gameKey="realitease" />
        </main>
      </div>
    </ClientOnly>
  );
}
