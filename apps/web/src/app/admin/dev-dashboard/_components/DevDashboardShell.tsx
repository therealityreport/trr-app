"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import type { AdminBreadcrumbItem } from "@/lib/admin/admin-breadcrumbs";

const DEV_DASHBOARD_ROUTES = [
  { href: "/admin/dev-dashboard", label: "Overview" },
  { href: "/admin/dev-dashboard/skills-and-agents", label: "Skills & Agents" },
] as const;

interface DevDashboardShellProps {
  activeRoute: (typeof DEV_DASHBOARD_ROUTES)[number]["href"];
  breadcrumbItems: AdminBreadcrumbItem[];
  title: string;
  description: string;
  generatedAt?: string | null;
  children: ReactNode;
}

export function DevDashboardShell({
  activeRoute,
  breadcrumbItems,
  title,
  description,
  generatedAt,
  children,
}: DevDashboardShellProps) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <AdminGlobalHeader bodyClassName="px-6 py-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <AdminBreadcrumbs items={breadcrumbItems} className="mb-1" />
            <div className="mt-1 flex items-center gap-3">
              <h1 className="text-3xl font-bold text-zinc-900">{title}</h1>
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-700">
                Dev
              </span>
            </div>
            <p className="mt-2 text-sm text-zinc-500">{description}</p>
            {generatedAt ? (
              <p className="mt-1 text-xs text-zinc-400">Generated: {new Date(generatedAt).toLocaleString()}</p>
            ) : null}
            <nav aria-label="Dev dashboard tabs" className="mt-4 flex flex-wrap gap-2">
              {DEV_DASHBOARD_ROUTES.map((route) => {
                const isActive = route.href === activeRoute;
                return (
                  <Link
                    key={route.href}
                    href={route.href}
                    className={
                      isActive
                        ? "rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
                        : "rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                    }
                    aria-current={isActive ? "page" : undefined}
                  >
                    {route.label}
                  </Link>
                );
              })}
            </nav>
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

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
