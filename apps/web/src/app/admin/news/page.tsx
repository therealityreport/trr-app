"use client";

import Link from "next/link";
import ClientOnly from "@/components/ClientOnly";
import BrandsTabs from "@/components/admin/BrandsTabs";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import { buildBrandsPageBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

export default function AdminNewsPage() {
  const { user, checking, hasAccess } = useAdminGuard();

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Preparing publications workspace...</p>
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
              <AdminBreadcrumbs
                items={buildBrandsPageBreadcrumb("Publications / News", "/brands/news")}
                className="mb-1"
              />
              <h1 className="break-words text-3xl font-bold text-zinc-900">Publications / News</h1>
              <p className="break-words text-sm text-zinc-500">Editorial and publication brand tracking.</p>
              <BrandsTabs activeTab="news" className="mt-4" />
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
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Coming Soon</p>
            <h2 className="mt-2 text-2xl font-bold text-zinc-900">Publications / News</h2>
            <p className="mt-2 text-sm text-zinc-600">
              This page is reserved for publication and news outlet brand management.
            </p>
          </section>
        </main>
      </div>
    </ClientOnly>
  );
}
