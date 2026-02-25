"use client";

import Link from "next/link";
import ClientOnly from "@/components/ClientOnly";
import BrandsTabs from "@/components/admin/BrandsTabs";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import { buildAdminSectionBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

export default function AdminBrandsPage() {
  const { user, checking, hasAccess } = useAdminGuard();

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Preparing brands workspace...</p>
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
              <AdminBreadcrumbs items={buildAdminSectionBreadcrumb("Brands", "/admin/brands")} className="mb-1" />
              <h1 className="break-words text-3xl font-bold text-zinc-900">Brands</h1>
              <p className="break-words text-sm text-zinc-500">
                Brand surfaces across networks, streaming services, production companies, publications, and show contexts.
              </p>
              <BrandsTabs activeTab="brands" className="mt-4" />
            </div>
            <div className="flex flex-wrap gap-3">
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
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Start Here</p>
            <h2 className="mt-2 text-2xl font-bold text-zinc-900">Brand Management</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Use the tabs above to move between network and streaming coverage, production companies, show-specific brand
              assets, publications/news tracking, and other brand buckets.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/admin/networks-and-streaming"
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Open Network & Streaming Services
              </Link>
              <Link
                href="/admin/production-companies"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Open Production Companies
              </Link>
              <Link
                href="/admin/news"
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Open Publications / News
              </Link>
            </div>
          </section>
        </main>
      </div>
    </ClientOnly>
  );
}
