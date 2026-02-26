"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import ClientOnly from "@/components/ClientOnly";
import RedditSourcesManager, { type RedditCommunityContext } from "@/components/admin/reddit-sources-manager";
import SocialAdminPageHeader from "@/components/admin/SocialAdminPageHeader";
import { buildSeasonSocialBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import type { SeasonAdminTab, SocialAnalyticsViewSlug } from "@/lib/admin/show-admin-routes";
import { buildSeasonAdminUrl, buildShowAdminUrl } from "@/lib/admin/show-admin-routes";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

const DEFAULT_BACK_HREF = "/admin/social-media";
const SEASON_TABS: Array<{ tab: SeasonAdminTab; label: string }> = [
  { tab: "overview", label: "Overview" },
  { tab: "episodes", label: "Seasons & Episodes" },
  { tab: "assets", label: "Assets" },
  { tab: "videos", label: "Videos" },
  { tab: "fandom", label: "Fandom" },
  { tab: "cast", label: "Cast" },
  { tab: "surveys", label: "Surveys" },
  { tab: "social", label: "Social Media" },
];
const SOCIAL_TABS: Array<{ view: SocialAnalyticsViewSlug; label: string }> = [
  { view: "bravo", label: "BRAVO ANALYTICS" },
  { view: "sentiment", label: "SENTIMENT ANALYSIS" },
  { view: "hashtags", label: "HASHTAGS ANALYSIS" },
  { view: "advanced", label: "ADVANCED ANALYTICS" },
  { view: "reddit", label: "REDDIT ANALYTICS" },
];

const resolveBackHref = (raw: string | null): string => {
  if (!raw) return DEFAULT_BACK_HREF;
  if (!raw.startsWith("/")) return DEFAULT_BACK_HREF;
  return raw;
};

export default function RedditCommunityViewPage() {
  const { user, checking, hasAccess } = useAdminGuard();
  const params = useParams<{ communityId?: string; communitySlug?: string }>();
  const searchParams = useSearchParams();

  const initialCommunityKey =
    typeof params.communitySlug === "string"
      ? params.communitySlug
      : typeof params.communityId === "string"
        ? params.communityId
        : "";
  const backHref = resolveBackHref(searchParams.get("return_to"));
  const [communityContext, setCommunityContext] = useState<RedditCommunityContext | null>(null);
  const showSlug = communityContext?.showSlug ?? null;
  const seasonNumber = communityContext?.seasonNumber ?? null;
  const showName = communityContext?.showFullName ?? communityContext?.showLabel ?? "Show";
  const hasSeasonContext =
    Boolean(showSlug) && typeof seasonNumber === "number" && Number.isFinite(seasonNumber);
  const showHref = showSlug ? buildShowAdminUrl({ showSlug }) : "/shows";
  const seasonHref =
    hasSeasonContext && showSlug
      ? buildSeasonAdminUrl({
          showSlug,
          seasonNumber,
        })
      : showHref;
  const redditHref =
    hasSeasonContext && showSlug
      ? buildSeasonAdminUrl({
          showSlug,
          seasonNumber,
          tab: "social",
          socialView: "reddit",
        })
      : backHref;
  const effectiveBackHref = showSlug ? showHref : backHref;
  const breadcrumbItems = useMemo(() => {
    return buildSeasonSocialBreadcrumb(showName, seasonNumber ?? "", {
      showHref,
      seasonHref,
      socialHref: redditHref,
      subTabLabel: "Reddit Analytics",
      subTabHref: redditHref,
    });
  }, [redditHref, seasonHref, seasonNumber, showHref, showName]);
  const pageTitle =
    hasSeasonContext && typeof seasonNumber === "number"
      ? `${showName} · Season ${seasonNumber}`
      : showName;

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
        <SocialAdminPageHeader
          breadcrumbs={breadcrumbItems}
          title={pageTitle}
          backHref={effectiveBackHref}
          backLabel="Back"
          bodyClassName="px-6 py-6"
        />

        <div className="border-b border-zinc-200 bg-white">
          <div className="mx-auto max-w-6xl px-6">
            <nav className="flex flex-wrap gap-2 py-4" aria-label="Season tabs">
              {SEASON_TABS.map((tab) => {
                const href =
                  hasSeasonContext && showSlug
                    ? buildSeasonAdminUrl({
                        showSlug,
                        seasonNumber: seasonNumber!,
                        tab: tab.tab,
                      })
                    : null;
                const isActive = tab.tab === "social";
                const classes = `rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                }`;
                if (!href) {
                  return (
                    <span key={tab.tab} className={classes}>
                      {tab.label}
                    </span>
                  );
                }
                return (
                  <a key={tab.tab} href={href} className={classes}>
                    {tab.label}
                  </a>
                );
              })}
            </nav>
            <nav className="flex flex-wrap gap-2 pb-4" aria-label="Social analytics tabs">
              {SOCIAL_TABS.map((tab) => {
                const href =
                  hasSeasonContext && showSlug
                    ? buildSeasonAdminUrl({
                        showSlug,
                        seasonNumber: seasonNumber!,
                        tab: "social",
                        socialView: tab.view,
                      })
                    : null;
                const isActive = tab.view === "reddit";
                const classes = `rounded-full border px-3 py-1.5 text-xs font-semibold tracking-[0.08em] transition ${
                  isActive
                    ? "border-zinc-800 bg-zinc-800 text-white"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                }`;
                if (!href) {
                  return (
                    <span key={tab.view} className={classes}>
                      {tab.label}
                    </span>
                  );
                }
                return (
                  <a key={tab.view} href={href} className={classes}>
                    {tab.label}
                  </a>
                );
              })}
            </nav>
          </div>
        </div>

        <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <RedditSourcesManager
              mode="global"
              initialCommunityId={initialCommunityKey}
              hideCommunityList
              backHref={backHref}
              episodeDiscussionsPlacement="inline"
              enableEpisodeSync
              onCommunityContextChange={setCommunityContext}
            />
          </section>
        </main>
      </div>
    </ClientOnly>
  );
}
