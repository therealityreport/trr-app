"use client";

import { useParams, useSearchParams } from "next/navigation";
import ClientOnly from "@/components/ClientOnly";
import AdminBreadcrumbs from "@/components/admin/AdminBreadcrumbs";
import RedditSourcesManager from "@/components/admin/reddit-sources-manager";
import { buildAdminSectionBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

const DEFAULT_BACK_HREF = "/admin/social-media";

const resolveBackHref = (raw: string | null): string => {
  if (!raw) return DEFAULT_BACK_HREF;
  if (!raw.startsWith("/")) return DEFAULT_BACK_HREF;
  return raw;
};

export default function RedditCommunityViewPage() {
  const { user, checking, hasAccess } = useAdminGuard();
  const params = useParams<{ communityId: string }>();
  const searchParams = useSearchParams();

  const communityId = typeof params.communityId === "string" ? params.communityId : "";
  const backHref = resolveBackHref(searchParams.get("return_to"));

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
            You are signed in but do not have permission to view this community.
          </p>
          <div className="mt-4">
            <a
              href={backHref}
              className="inline-flex rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
            >
              Back
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ClientOnly>
      <div className="min-h-screen bg-zinc-50">
        <header className="border-b border-zinc-200 bg-white px-6 py-6">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            <div>
              <AdminBreadcrumbs
                items={[...buildAdminSectionBreadcrumb("Social Analytics", "/admin/social-media"), { label: "Reddit Community View" }]}
                className="mb-1"
              />
              <h1 className="text-2xl font-bold text-zinc-900">Reddit Community View</h1>
            </div>
            <a
              href={backHref}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              Back
            </a>
          </div>
        </header>

        <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <RedditSourcesManager
              mode="global"
              initialCommunityId={communityId}
              hideCommunityList
              backHref={backHref}
            />
          </section>
        </main>
      </div>
    </ClientOnly>
  );
}
