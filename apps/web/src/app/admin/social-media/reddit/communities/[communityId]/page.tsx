"use client";

import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Route } from "next";
import ClientOnly from "@/components/ClientOnly";
import RedditSourcesManager, { type RedditCommunityContext } from "@/components/admin/reddit-sources-manager";
import SocialAdminPageHeader from "@/components/admin/SocialAdminPageHeader";
import { buildSeasonSocialBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import type { SeasonAdminTab, SocialAnalyticsViewSlug } from "@/lib/admin/show-admin-routes";
import {
  buildSeasonAdminUrl,
  buildShowAdminUrl,
  buildShowRedditCommunityUrl,
  buildShowRedditUrl,
} from "@/lib/admin/show-admin-routes";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

const DEFAULT_BACK_HREF = "/admin/social-media";
const SEASON_TABS: Array<{ tab: SeasonAdminTab; label: string }> = [
  { tab: "overview", label: "Home" },
  { tab: "episodes", label: "Episodes" },
  { tab: "assets", label: "Assets" },
  { tab: "news", label: "News" },
  { tab: "fandom", label: "Fandom" },
  { tab: "cast", label: "Cast" },
  { tab: "surveys", label: "Surveys" },
  { tab: "social", label: "Social Media" },
];
const SOCIAL_TABS: Array<{ view: SocialAnalyticsViewSlug; label: string }> = [
  { view: "official", label: "OFFICIAL ANALYTICS" },
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

const parseRootRedditCommunityPath = (
  pathname: string,
): { showSlug: string; communitySlug: string; seasonNumber: number | null } | null => {
  const match = pathname.match(/^\/([^/]+)\/social\/reddit\/([^/]+?)(?:\/s(\d+))?\/?$/i);
  if (!match) return null;
  let showSlug = "";
  let communitySlug = "";
  try {
    showSlug = decodeURIComponent(match[1] ?? "").trim();
    communitySlug = decodeURIComponent(match[2] ?? "").trim();
  } catch {
    return null;
  }
  const seasonRaw = match[3] ?? null;
  const seasonNumber = seasonRaw ? Number.parseInt(seasonRaw, 10) : null;
  return {
    showSlug,
    communitySlug,
    seasonNumber: Number.isFinite(seasonNumber) && seasonNumber !== null ? seasonNumber : null,
  };
};

export default function RedditCommunityViewPage() {
  const { user, checking, hasAccess } = useAdminGuard();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ showId?: string; seasonNumber?: string; communityId?: string; communitySlug?: string }>();
  const searchParams = useSearchParams();
  const canonicalRedirectRef = useRef<string | null>(null);

  const initialCommunityKey =
    typeof params.communitySlug === "string"
      ? params.communitySlug
      : typeof params.communityId === "string"
        ? params.communityId
        : "";
  const queryShowSlug = (() => {
    const value = searchParams.get("showSlug") ?? searchParams.get("show") ?? null;
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  })();
  const routeShowSlug =
    typeof params.showId === "string" && params.showId.trim().length > 0
      ? params.showId.trim()
      : queryShowSlug;
  const querySeasonNumber = (() => {
    const raw = searchParams.get("season");
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  })();
  const routeSeasonNumber = (() => {
    if (typeof params.seasonNumber !== "string") return null;
    const parsed = Number.parseInt(params.seasonNumber, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  })();
  const backHref = resolveBackHref(searchParams.get("return_to"));
  const [communityContext, setCommunityContext] = useState<RedditCommunityContext | null>(null);
  const showSlug = routeShowSlug ?? communityContext?.showSlug;
  const seasonNumber = routeSeasonNumber ?? querySeasonNumber ?? communityContext?.seasonNumber;
  const canonicalSeasonNumber = routeSeasonNumber ?? querySeasonNumber;
  const communitySlug = communityContext?.communitySlug ?? initialCommunityKey;
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
  const redditHref = showSlug
    ? buildShowRedditUrl({
        showSlug,
        seasonNumber,
      })
    : backHref;
  const effectiveBackHref = showSlug ? showHref : backHref;
  const canonicalCommunityHref = useMemo(() => {
    if (!showSlug || !communitySlug) return null;
    return buildShowRedditCommunityUrl({
      showSlug,
      communitySlug,
      seasonNumber: canonicalSeasonNumber,
    });
  }, [canonicalSeasonNumber, communitySlug, showSlug]);

  useEffect(() => {
    if (!canonicalCommunityHref) return;
    if (pathname === canonicalCommunityHref) return;
    const current = parseRootRedditCommunityPath(pathname);
    if (current && showSlug && communitySlug) {
      const sameShow = current.showSlug.toLowerCase() === showSlug.toLowerCase();
      const sameCommunity = current.communitySlug.toLowerCase() === communitySlug.toLowerCase();
      const canonicalSeason =
        typeof canonicalSeasonNumber === "number" && Number.isFinite(canonicalSeasonNumber)
          ? canonicalSeasonNumber
          : null;
      const sameSeason = current.seasonNumber === canonicalSeason;
      // Avoid redirect churn for case-only differences in slug segments.
      if (sameShow && sameCommunity && sameSeason) {
        return;
      }
      // Accept both URL forms:
      // /{show}/social/reddit/{community}
      // /{show}/social/reddit/{community}/s{season}
      // Do not inject or strip season token solely from async context updates.
      if (sameShow && sameCommunity) {
        return;
      }
    }
    const nextQuery = new URLSearchParams(searchParams.toString());
    nextQuery.delete("return_to");
    nextQuery.delete("showSlug");
    nextQuery.delete("show");
    nextQuery.delete("season");
    const queryString = nextQuery.toString();
    const nextHref = `${canonicalCommunityHref}${queryString ? `?${queryString}` : ""}`;
    if (canonicalRedirectRef.current === nextHref) return;
    canonicalRedirectRef.current = nextHref;
    router.replace(nextHref as Route);
  }, [canonicalCommunityHref, canonicalSeasonNumber, communitySlug, pathname, router, searchParams, showSlug]);
  const breadcrumbItems = useMemo(() => {
    return buildSeasonSocialBreadcrumb(showName, seasonNumber ?? "", {
      showHref,
      seasonHref,
      socialHref: redditHref,
      subTabLabel: "Reddit Analytics",
      subTabHref: redditHref,
    });
  }, [redditHref, seasonHref, seasonNumber, showHref, showName]);
  const pageTitle = (() => {
    const communityLabel =
      communityContext?.communityLabel?.trim() ||
      (communitySlug ? `r/${communitySlug}` : "");
    if (communityLabel) return communityLabel;
    if (hasSeasonContext && typeof seasonNumber === "number") {
      return `${showName} · Season ${seasonNumber}`;
    }
    return showName;
  })();

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
                    ? tab.view === "reddit"
                      ? buildShowRedditUrl({
                          showSlug,
                          seasonNumber,
                        })
                      : buildSeasonAdminUrl({
                          showSlug,
                          seasonNumber: seasonNumber!,
                          tab: "social",
                          socialView: tab.view,
                        })
                    : showSlug && tab.view === "reddit"
                      ? buildShowRedditUrl({
                          showSlug,
                          seasonNumber,
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
              showSlug={routeShowSlug ?? undefined}
              initialCommunityId={initialCommunityKey}
              hideCommunityList
              backHref={redditHref}
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
