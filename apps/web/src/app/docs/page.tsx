"use client";

import Link from "next/link";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import { AdminDocsCatalogContent } from "@/components/admin/AdminDocsCatalogContent";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import { buildAdminSectionBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

export default function AdminDocsPage() {
  const { user, checking, hasAccess } = useAdminGuard();

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Preparing admin docs...</p>
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
          <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <AdminBreadcrumbs items={buildAdminSectionBreadcrumb("Docs", "/docs")} className="mb-1" />
              <h1 className="text-3xl font-bold text-zinc-900">Docs</h1>
              <p className="mt-1 text-sm text-zinc-500">
                Exact admin pages, CTA labels, and trigger locations for TRR-APP job workflows.
              </p>
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

        <AdminDocsCatalogContent />
      </div>
    </ClientOnly>
  );
}
