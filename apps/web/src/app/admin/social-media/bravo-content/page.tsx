"use client";

import Link from "next/link";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import { buildAdminSectionBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

const BRAVO_ACCOUNT_MAP = [
  { platform: "Instagram", accounts: ["bravotv", "bravodailydish", "bravowwhl"] },
  { platform: "TikTok", accounts: ["bravotv", "bravowwhl"] },
  { platform: "Twitter/X", accounts: ["bravotv", "bravowwhl"] },
  { platform: "YouTube", accounts: ["bravo", "wwhl"] },
];

export default function BravoContentDashboardPage() {
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
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
        <div className="w-full max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-700">Access Required</p>
          <h1 className="mt-2 text-xl font-bold">Admin access is required</h1>
          <p className="mt-2 text-sm text-amber-800">
            You are signed in but do not have permission to view this Social Analytics page.
          </p>
          <div className="mt-4">
            <Link
              href="/admin/social-media"
              className="inline-flex rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
            >
              Back to Social Analytics
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        <header className="border-b border-zinc-200 bg-white px-6 py-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <AdminBreadcrumbs
                items={[...buildAdminSectionBreadcrumb("Social Analytics", "/admin/social-media"), { label: "Bravo Content" }]}
                className="mb-1"
              />
              <h1 className="text-3xl font-bold text-zinc-900">Bravo Content</h1>
              <p className="text-sm text-zinc-500">
                Official Bravo account analysis, episode comparisons, cast sentiment, and hashtag trends.
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/admin/social-media"
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Back
              </Link>
              <Link
                href="/admin/trr-shows"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Open Shows
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-zinc-900">Account Mapping</h2>
            <p className="mt-1 text-sm text-zinc-600">Current Bravo Content account set by platform.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {BRAVO_ACCOUNT_MAP.map((entry) => (
                <div key={entry.platform} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">{entry.platform}</p>
                  <p className="mt-2 text-sm text-zinc-800">{entry.accounts.join(", ")}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              "Overview",
              "Accounts",
              "Platforms",
              "Episode Comparison",
              "Cast Sentiment",
              "Hashtag Analysis",
            ].map((section) => (
              <article key={section} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Section</p>
                <h3 className="mt-2 text-lg font-semibold text-zinc-900">{section}</h3>
                <p className="mt-2 text-sm text-zinc-600">
                  Built on season-level social analytics and detailed week breakdown pages.
                </p>
              </article>
            ))}
          </section>
        </main>
      </div>
    </ClientOnly>
  );
}
