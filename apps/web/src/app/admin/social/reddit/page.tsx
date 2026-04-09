"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import ClientOnly from "@/components/ClientOnly";
import RedditAdminShell from "@/components/admin/RedditAdminShell";
import RedditSourcesManager from "@/components/admin/reddit-sources-manager";
import { buildAdminSectionBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import { fetchAdminWithAuth } from "@/lib/admin/client-auth";
import type { SocialLandingPayload } from "@/lib/admin/social-landing";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

const loadLandingData = async (currentUser: User): Promise<SocialLandingPayload> => {
  const response = await fetchAdminWithAuth("/api/admin/social/landing", undefined, {
    allowDevAdminBypass: true,
    preferredUser: currentUser,
  });
  const data = (await response.json().catch(() => ({}))) as
    | ({ error?: string } & Partial<SocialLandingPayload>)
    | undefined;
  if (!response.ok) {
    throw new Error(data?.error || "Failed to load social landing data");
  }
  return {
    network_sets: Array.isArray(data?.network_sets) ? data.network_sets : [],
    show_sets: Array.isArray(data?.show_sets) ? data.show_sets : [],
    people_profiles: Array.isArray(data?.people_profiles) ? data.people_profiles : [],
    shared_pipeline: {
      sources: Array.isArray(data?.shared_pipeline?.sources)
        ? data.shared_pipeline.sources
        : [],
      runs: Array.isArray(data?.shared_pipeline?.runs)
        ? data.shared_pipeline.runs
        : [],
      review_items: Array.isArray(data?.shared_pipeline?.review_items)
        ? data.shared_pipeline.review_items
        : [],
    },
    reddit_dashboard: {
      active_community_count:
        typeof data?.reddit_dashboard?.active_community_count === "number"
          ? data.reddit_dashboard.active_community_count
          : 0,
      archived_community_count:
        typeof data?.reddit_dashboard?.archived_community_count === "number"
          ? data.reddit_dashboard.archived_community_count
          : 0,
      show_count:
        typeof data?.reddit_dashboard?.show_count === "number"
          ? data.reddit_dashboard.show_count
          : 0,
    },
  };
};

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold text-zinc-900">{value.toLocaleString()}</p>
      <p className="mt-1 text-sm text-zinc-500">{detail}</p>
    </div>
  );
}

export default function RedditDashboardPage() {
  const { user, checking, hasAccess } = useAdminGuard();
  const [landing, setLanding] = useState<SocialLandingPayload | null>(null);
  const [loadingLanding, setLoadingLanding] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (checking || !user || !hasAccess) return;

    let cancelled = false;
    const load = async () => {
      setLoadingLanding(true);
      setLoadError(null);
      try {
        const payload = await loadLandingData(user);
        if (!cancelled) {
          setLanding(payload);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load social landing data",
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingLanding(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [checking, hasAccess, user]);

  const redditSummary = landing?.reddit_dashboard ?? {
    active_community_count: 0,
    archived_community_count: 0,
    show_count: 0,
  };
  const totalCommunities =
    redditSummary.active_community_count + redditSummary.archived_community_count;
  const breadcrumbs = useMemo(
    () => [
      ...buildAdminSectionBreadcrumb("Social Analytics", "/social"),
      { label: "Reddit Dashboard", href: "/social/reddit" },
    ],
    [],
  );

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
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-700">
            Access Required
          </p>
          <h1 className="mt-2 text-xl font-bold">Admin access is required</h1>
          <p className="mt-2 text-sm text-amber-800">
            You are signed in but do not have permission to view the Reddit dashboard.
          </p>
          <div className="mt-4">
            <Link
              href="/social"
              className="inline-flex rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
            >
              Back to Social
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ClientOnly>
      <RedditAdminShell
        breadcrumbs={breadcrumbs}
        title="Reddit Dashboard"
        backHref="/social"
        backLabel="Back to Social"
        seasonLinks={[{ key: "social", label: "Social Hub", href: "/social" }]}
        socialLinks={[
          {
            key: "reddit-dashboard",
            label: "REDDIT DASHBOARD",
            href: "/social/reddit",
            isActive: true,
          },
        ]}
        hero={
          <div className="space-y-4">
            <p className="max-w-3xl text-sm text-zinc-600">
              Saved Reddit communities across shows, with the existing operations workspace below.
            </p>
            {loadError ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {loadError}
              </div>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <SummaryCard
                label="Total Communities"
                value={totalCommunities}
                detail="Saved communities across the admin inventory."
              />
              <SummaryCard
                label="Active"
                value={redditSummary.active_community_count}
                detail="Communities currently in active use."
              />
              <SummaryCard
                label="Archived"
                value={redditSummary.archived_community_count}
                detail="Saved communities hidden by default in the list."
              />
              <SummaryCard
                label="Shows Covered"
                value={redditSummary.show_count}
                detail="Distinct shows represented in saved Reddit communities."
              />
            </div>
            {loadingLanding ? (
              <p className="text-sm text-zinc-500">Loading Reddit summary…</p>
            ) : null}
          </div>
        }
      >
        <section className="rounded-3xl border border-zinc-200/80 bg-white/95 p-6 shadow-sm">
          <RedditSourcesManager
            mode="global"
            hideCommunityList={false}
            episodeDiscussionsPlacement="hidden"
            inventoryOnly
          />
        </section>
      </RedditAdminShell>
    </ClientOnly>
  );
}
