import Link from "next/link";
import type { Route } from "next";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import type { AdminBreadcrumbItem } from "@/lib/admin/admin-breadcrumbs";

interface SocialAdminPageHeaderProps {
  breadcrumbs: AdminBreadcrumbItem[];
  title: string;
  backHref: string;
  backLabel?: string;
  bodyClassName?: string;
}

export default function SocialAdminPageHeader({
  breadcrumbs,
  title,
  backHref,
  backLabel = "Back",
  bodyClassName = "px-6 py-6",
}: SocialAdminPageHeaderProps) {
  return (
    <AdminGlobalHeader bodyClassName={bodyClassName}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div>
          <AdminBreadcrumbs items={breadcrumbs} className="mb-1" />
          <h1 className="text-2xl font-bold text-zinc-900">{title}</h1>
        </div>
        <Link
          href={backHref as Route}
          className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
        >
          {backLabel}
        </Link>
      </div>
    </AdminGlobalHeader>
  );
}
