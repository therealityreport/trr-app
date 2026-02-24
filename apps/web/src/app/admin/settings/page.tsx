"use client";

import Link from "next/link";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import { buildAdminSectionBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

export default function AdminSettingsPage() {
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
              <AdminBreadcrumbs items={buildAdminSectionBreadcrumb("Settings")} className="mb-1" />
              <h1 className="text-3xl font-bold text-zinc-900">Settings</h1>
              <p className="text-sm text-zinc-500">Application and admin settings.</p>
            </div>
            <Link
              href="/admin"
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              Back to Admin
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-8">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Coming Soon</p>
            <h2 className="mt-2 text-2xl font-bold text-zinc-900">Settings</h2>
            <p className="mt-2 text-sm text-zinc-600">
              This container is a placeholder for future admin tooling (feature flags, environment config, and diagnostics).
            </p>
          </section>
        </main>
      </div>
    </ClientOnly>
  );
}
