"use client";

import Link from "next/link";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import { buildAdminRootBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

const ADMIN_TOOLS = [
  {
    key: "dev-dashboard",
    title: "Dev Dashboard",
    description: "Git status, branches, PRs, commits, and outstanding tasks across all TRR workspace repos.",
    href: "/admin/dev-dashboard" as const,
    badge: "Dev",
  },
  {
    key: "trr-shows",
    title: "Shows",
    description: "Browse the TRR metadata database. View shows, seasons, cast, and create linked surveys.",
    href: "/admin/trr-shows" as const,
    badge: "API",
  },
  {
    key: "networks-streaming",
    title: "Networks & Streaming",
    description: "View network/provider coverage counts and run sync/mirror enrichment workflows.",
    href: "/admin/networks" as const,
    badge: "Data",
  },
  {
    key: "users",
    title: "Users",
    description: "Manage users, roles, and admin access controls.",
    href: "/admin/users" as const,
    badge: "Admin",
  },
  {
    key: "games",
    title: "Games",
    description: "Manage games and interactive experiences.",
    href: "/admin/games" as const,
    badge: "Games",
  },
  {
    key: "social-media",
    title: "Social Media",
    description: "Manage social media pipelines, templates, and publishing workflows.",
    href: "/admin/social-media" as const,
    badge: "Social",
  },
  {
    key: "groups",
    title: "Groups",
    description: "Manage user groups and community segmentation.",
    href: "/admin/groups" as const,
    badge: "Groups",
  },
  {
    key: "settings",
    title: "Settings",
    description: "Configure environment and application settings.",
    href: "/admin/settings" as const,
    badge: "Settings",
  },
  {
    key: "design-system",
    title: "UI Design System",
    description: "Reference for fonts, survey question components, and form patterns used across the app.",
    href: "/admin/fonts" as const,
    badge: "Design",
  },
] as const;

export default function AdminDashboardPage() {
  const { user, checking, hasAccess } = useAdminGuard();

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
          <p className="text-sm text-zinc-600">Preparing admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return null;
  }

  const displayName = user.displayName ?? user.email ?? "Admin";

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        <header className="border-b border-zinc-200 bg-white px-6 py-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <AdminBreadcrumbs items={buildAdminRootBreadcrumb()} className="mb-1" />
              <h1 className="break-words text-3xl font-bold text-zinc-900">Welcome, {displayName}</h1>
              <p className="break-words text-sm text-zinc-500">
                Superfan tooling for The Reality Report - manage fonts, view survey analytics, and export data.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/hub"
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Back to Hub
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-8">
          <section className="mb-8 rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Access Level</p>
                <p className="text-lg font-semibold text-zinc-900">The Reality Report Superfan</p>
                <p className="break-words text-sm text-zinc-500">Display name verified as The Reality Report Superfan @the_reality_report1</p>
              </div>
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                <p className="font-semibold">Authorized</p>
                <p className="text-xs">Admin endpoints, exports, and tools are unlocked for this session.</p>
              </div>
            </div>
          </section>

          <section className="mb-10">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-zinc-900">Available Tools</h2>
                <p className="text-sm text-zinc-500">Jump into any admin experience from one place.</p>
              </div>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600">
                {ADMIN_TOOLS.length} tools
              </span>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {ADMIN_TOOLS.map((tool) => (
                <Link
                  key={tool.key}
                  href={tool.href}
                  className="group min-w-0 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-black/50 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">{tool.badge}</p>
                      <h3 className="mt-1 break-words text-xl font-bold text-zinc-900">{tool.title}</h3>
                    </div>
                    <div className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-semibold text-zinc-600">
                      Open
                    </div>
                  </div>
                  <p className="mt-3 break-words text-sm text-zinc-600">{tool.description}</p>
                  <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-zinc-900">
                    <span className="transition group-hover:translate-x-0.5">Launch</span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="transition group-hover:translate-x-0.5"
                    >
                      <path
                        d="M4 12L12 4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12 11V4H5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-zinc-900">Recent Updates</h3>
              <ul className="mt-4 space-y-3 text-sm text-zinc-600">
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-black" />
                  <span>New survey registry powers CSV exports & filtered queries for all surveys.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-black" />
                  <span>Font library documents every licensed family with usage guidelines.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-black" />
                  <span>Display-name based access ensures only your Superfan identity can view admin tools.</span>
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-800">
              <h3 className="text-lg font-semibold text-blue-900">Need something else?</h3>
              <p className="mt-2">
                This dashboard will grow with more internal tools. Let the team know if you need additional admin-level
                access, exports, or diagnostics.
              </p>
              <ul className="mt-4 space-y-2">
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  Request new survey filters or visualizations.
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  Ask for additional design asset references or download links.
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  Report any access issues tied to your Superfan username.
                </li>
              </ul>
            </div>
          </section>
        </main>
      </div>
    </ClientOnly>
  );
}
