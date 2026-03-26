"use client";

import Link from "next/link";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import AdminGlobalHeader from "@/components/admin/AdminGlobalHeader";
import AdminGlobalSearch from "@/components/admin/AdminGlobalSearch";
import { buildAdminRootBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { ADMIN_DASHBOARD_TOOLS } from "@/lib/admin/admin-navigation";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

const RECENT_UPDATES = [
  "Survey exports now route through the shared survey registry.",
  "Typography coverage is documented in the design-system and design-docs surfaces.",
  "Display-name based access is still the only path into the admin workspace.",
] as const;

const STATUS_NOTES = [
  "Use global search first when you already know the show, person, or episode.",
  "Open Design Docs for composition guidance before rebuilding dense UI.",
  "Use Settings and Users for access work instead of editing local state directly.",
] as const;
const ACCENT = "#7A0307";

export default function AdminDashboardPage() {
  const { user, checking, hasAccess } = useAdminGuard();

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-black border-t-transparent" />
          <p className="text-sm text-black/75">Preparing admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || !hasAccess) {
    return null;
  }

  const displayName = user.displayName ?? user.email ?? "Admin";
  const primaryTools = ADMIN_DASHBOARD_TOOLS.filter((tool) =>
    ["trr-shows", "screenalytics", "people", "surveys", "social-media", "games"].includes(tool.key),
  );
  const secondaryTools = ADMIN_DASHBOARD_TOOLS.filter(
    (tool) => !primaryTools.some((primaryTool) => primaryTool.key === tool.key),
  );

  return (
    <ClientOnly>
      <div className="min-h-screen bg-white">
        <AdminGlobalHeader bodyClassName="px-6 py-6">
          <div className="mx-auto max-w-7xl">
            <AdminBreadcrumbs items={buildAdminRootBreadcrumb()} className="mb-3" />
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] lg:items-start">
              <div className="max-w-3xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: ACCENT }}>
                  Admin operations
                </p>
                <h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-black sm:text-5xl">
                  Search, route, and act.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-black/75 sm:text-base">
                  {displayName}, this page is the fast entry point for shows, people, seasons, surveys,
                  and diagnostics. Search first when you know the target. Use the route list below when
                  you need the right workspace quickly.
                </p>
                <section
                  aria-label="Admin dashboard quick search"
                  className="mt-6 rounded-[1.8rem] border-2 border-black bg-white p-6"
                >
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: ACCENT }}>
                        Quick search
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-black">
                        Jump straight to the target record.
                      </h2>
                      <p className="mt-2 text-sm leading-7 text-black/75">
                        Search shows, people, and episodes from here before opening a larger admin route.
                      </p>
                    </div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/50">
                      Start typing at 3 characters
                    </div>
                  </div>
                  <div className="mt-6">
                    <AdminGlobalSearch variant="hero" />
                  </div>
                </section>
              </div>
              <div className="grid gap-3 text-left sm:grid-cols-3 lg:grid-cols-1">
                {[
                  ["Primary tools", primaryTools.length.toString()],
                  ["Reference routes", secondaryTools.length.toString()],
                  ["Signed in", "Active"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[1.5rem] border border-black bg-white px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
                      {label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-black">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AdminGlobalHeader>

        <main className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
          <section className="min-w-0 space-y-8">
            <section className="rounded-[1.8rem] border-2 border-black bg-white p-6">
              <div className="flex flex-col gap-2 border-b border-black pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: ACCENT }}>
                    Primary routes
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-black">
                    Core workflows
                  </h2>
                </div>
                <p className="text-sm text-black/65">High-frequency admin surfaces.</p>
              </div>

              <div className="mt-2 divide-y divide-black">
                {primaryTools.map((tool) => (
                  <Link
                    key={tool.key}
                    href={tool.href}
                    className="group grid gap-4 px-1 py-5 transition hover:bg-black/[0.02] md:grid-cols-[8rem_minmax(0,1fr)_auto] md:items-start"
                  >
                    <div className="pt-1">
                      <span
                        className="rounded-full border border-black bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
                        style={{ color: ACCENT }}
                      >
                        {tool.badge}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl font-semibold tracking-[-0.03em] text-black">
                        {tool.title}
                      </h3>
                      <p className="mt-2 max-w-2xl text-sm leading-7 text-black/75">
                        {tool.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-black transition group-hover:opacity-70">
                      <span>Open</span>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path
                          d="M3.5 10.5L10.5 3.5M10.5 3.5H4.75M10.5 3.5V9.25"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-[1.8rem] border-2 border-black bg-white p-6">
              <div className="flex flex-col gap-2 border-b border-black pb-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: ACCENT }}>
                    Reference routes
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-black">
                    Secondary surfaces
                  </h2>
                </div>
                <p className="text-sm text-black/65">Lower-frequency but still routable from here.</p>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {secondaryTools.map((tool) => (
                  <Link
                    key={tool.key}
                    href={tool.href}
                    className="rounded-[1.4rem] border border-black bg-white px-4 py-4 transition hover:bg-black/[0.02]"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: ACCENT }}>
                      {tool.badge}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-black">{tool.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-black/75">{tool.description}</p>
                  </Link>
                ))}
              </div>
            </section>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[1.8rem] border border-black bg-white p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: ACCENT }}>
                Status notes
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-black">
                What this page is for
              </h2>
              <ul className="mt-5 space-y-4 text-sm leading-7 text-black/75">
                {STATUS_NOTES.map((note) => (
                  <li key={note} className="flex gap-3">
                    <span className="mt-3 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: ACCENT }} />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-[1.8rem] border border-black bg-white p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: ACCENT }}>
                Recent updates
              </p>
              <div className="mt-5 space-y-5">
                {RECENT_UPDATES.map((update, index) => (
                  <div key={update} className="border-b border-black pb-5 last:border-b-0 last:pb-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-black/50">
                      Update {index + 1}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-black/75">{update}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[1.8rem] border border-black bg-white p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: ACCENT }}>
                Access path
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-black">
                Need a different route?
              </h2>
              <p className="mt-3 text-sm leading-7 text-black/75">
                Use the top navigation search for records, Design Docs for UI guidance, and Users or
                Settings when the task is access-related. This page should stay operational, not promotional.
              </p>
            </section>
          </aside>
        </main>
      </div>
    </ClientOnly>
  );
}
