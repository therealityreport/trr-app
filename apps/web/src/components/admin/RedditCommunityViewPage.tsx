"use client";

import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Route } from "next";
import ClientOnly from "@/components/ClientOnly";
import RedditAdminShell from "@/components/admin/RedditAdminShell";
import RedditSourcesManager, { type RedditCommunityContext } from "@/components/admin/reddit-sources-manager";
import { buildSeasonSocialBreadcrumb } from "@/lib/admin/admin-breadcrumbs";
import type { SeasonAdminTab, SocialAnalyticsViewSlug } from "@/lib/admin/show-admin-routes";
import {
  buildAdminRedditCommunityUrl,
  buildSeasonAdminUrl,
  buildShowRedditCommunityUrl,
  buildShowRedditUrl,
} from "@/lib/admin/show-admin-routes";
import { useAdminGuard } from "@/lib/admin/useAdminGuard";

const DEFAULT_BACK_HREF = "/admin/social";
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
  { view: "official", label: "OFFICIAL ANALYSIS" },
  { view: "sentiment", label: "SENTIMENT ANALYSIS" },
  { view: "hashtags", label: "HASHTAGS ANALYSIS" },
  { view: "advanced", label: "ADVANCED ANALYTICS" },
  { view: "reddit", label: "REDDIT ANALYTICS" },
  { view: "cast-content", label: "CAST COMPARISON" },
];

const resolveBackHref = (raw: string | null): string => {
  if (!raw) return DEFAULT_BACK_HREF;
  if (!raw.startsWith("/")) return DEFAULT_BACK_HREF;
  return raw;
};

const parseRootRedditCommunityPath = (
  pathname: string,
): { showSlug: string; communitySlug: string; seasonNumber: number | null } | null => {
  const adminMatch = pathname.match(
    /^\/admin\/social(?:-media)?\/reddit\/([^/]+)\/([^/]+?)(?:\/s(\d+))?\/?$/i,
  );
  if (adminMatch) {
    const firstSegment = decodeURIComponent(adminMatch[1] ?? "").trim();
    if (firstSegment.toLowerCase() === "communities") {
      return null;
    }
    const showSlug = decodeURIComponent(adminMatch[2] ?? "").trim();
    const seasonRaw = adminMatch[3] ?? null;
    const seasonNumber = seasonRaw ? Number.parseInt(seasonRaw, 10) : null;
    return {
      showSlug,
      communitySlug: firstSegment,
      seasonNumber: Number.isFinite(seasonNumber) && seasonNumber !== null ? seasonNumber : null,
    };
  }
  if (/^\/admin\/social(?:-media)?\/reddit(?:\/|$)/i.test(pathname)) {
    return null;
  }
  const match = pathname.match(/^\/(?:shows\/)?([^/]+)\/social\/reddit\/([^/]+?)(?:\/s(\d+))?\/?$/i);
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

const normalizeSlugCandidate = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isAliasLikeShowSlug = (value: string | null | undefined): boolean => {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return /^rh[a-z0-9]{2,}$/i.test(normalized) && !normalized.includes("-");
};

export default function RedditCommunityViewPage() {
  const { user, checking, hasAccess } = useAdminGuard();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{
    showId?: string;
    showSlug?: string;
    seasonNumber?: string;
    communityId?: string;
    communitySlug?: string;
  }>();
  const searchParams = useSearchParams();
  const canonicalRedirectRef = useRef<string | null>(null);
  const isAdminCommunityRoute = /^\/admin\/social(?:-media)?\/reddit(?:\/|$)/i.test(pathname);

  const initialCommunityKey =
    typeof params.communitySlug === "string"
      ? params.communitySlug
      : typeof params.communityId === "string"
        ? params.communityId
        : "";
  const rootPathContext = useMemo(() => parseRootRedditCommunityPath(pathname), [pathname]);
  const pathShowSlugParam =
    typeof params.showSlug === "string" && params.showSlug.trim().length > 0
      ? params.showSlug.trim()
      : null;
  const pathShowSlug =
    pathShowSlugParam ??
    (typeof params.showId === "string" && params.showId.trim().length > 0
      ? params.showId.trim()
      : null);
  const pathnameShowSlug = normalizeSlugCandidate(rootPathContext?.showSlug);
  const queryShowSlug = (() => {
    const value = searchParams.get("showSlug") ?? searchParams.get("show") ?? null;
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  })();
  const routeShowSlug = pathnameShowSlug ?? pathShowSlug ?? queryShowSlug;
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
  const returnPathContext = useMemo(() => parseRootRedditCommunityPath(backHref), [backHref]);
  const [communityContext, setCommunityContext] = useState<RedditCommunityContext | null>(null);
  const [pinnedShowSlug, setPinnedShowSlug] = useState<string | null>(() => routeShowSlug);
  const showSlug = useMemo(() => {
    const contextShowSlug = normalizeSlugCandidate(communityContext?.showSlug);
    const pathnameCandidate = normalizeSlugCandidate(pathnameShowSlug);
    const pathCandidate = normalizeSlugCandidate(pathShowSlug);
    const queryCandidate = normalizeSlugCandidate(queryShowSlug);
    const pinnedCandidate = normalizeSlugCandidate(pinnedShowSlug);
    const aliasPreferred =
      [pathnameCandidate, contextShowSlug, pathCandidate, queryCandidate, pinnedCandidate].find((candidate) =>
        isAliasLikeShowSlug(candidate),
      ) ?? null;
    if (aliasPreferred) return aliasPreferred;
    return (
      pathnameCandidate ??
      pathCandidate ??
      queryCandidate ??
      pinnedCandidate ??
      contextShowSlug ??
      null
    );
  }, [communityContext?.showSlug, pathShowSlug, pathnameShowSlug, pinnedShowSlug, queryShowSlug]);
  const seasonNumber = routeSeasonNumber ?? querySeasonNumber ?? communityContext?.seasonNumber;
  const canonicalSeasonNumber = routeSeasonNumber ?? querySeasonNumber ?? communityContext?.seasonNumber;
  const canonicalSeasonId = communityContext?.seasonId ?? null;
  const communitySlug = communityContext?.communitySlug ?? initialCommunityKey;
  const showName = communityContext?.showFullName ?? communityContext?.showLabel ?? "Show";
  const hasSeasonContext =
    Boolean(showSlug) && typeof seasonNumber === "number" && Number.isFinite(seasonNumber);
  const showHref = showSlug ? `/${encodeURIComponent(showSlug)}` : "/shows";
  const seasonHref =
    hasSeasonContext && showSlug
      ? `/${encodeURIComponent(showSlug)}/s${seasonNumber}`
      : showHref;
  const redditHref = showSlug
    ? buildShowRedditUrl({
        showSlug,
        seasonNumber,
      })
    : backHref;
  const effectiveBackHref = showSlug ? showHref : backHref;
  const prefersPublicCommunityRoute = Boolean(pathnameShowSlug || queryShowSlug || returnPathContext?.showSlug);
  const canonicalCommunityHref = useMemo(() => {
    if (!showSlug || !communitySlug) return null;
    if (!prefersPublicCommunityRoute && isAdminCommunityRoute) {
      return buildAdminRedditCommunityUrl({
        communitySlug,
        showSlug,
        seasonNumber: canonicalSeasonNumber,
      });
    }
    return buildShowRedditCommunityUrl({
      communitySlug,
      showSlug,
      seasonNumber: canonicalSeasonNumber,
    });
  }, [canonicalSeasonNumber, communitySlug, isAdminCommunityRoute, prefersPublicCommunityRoute, showSlug]);

  useEffect(() => {
    const candidate = pathnameShowSlug ?? pathShowSlug ?? queryShowSlug;
    if (!candidate) return;
    setPinnedShowSlug((current) => (current === candidate ? current : candidate));
  }, [pathShowSlug, pathnameShowSlug, queryShowSlug]);

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
      if (sameShow && sameCommunity && (canonicalSeason === null || sameSeason)) {
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
    const items = buildSeasonSocialBreadcrumb(showName, seasonNumber ?? "", {
      showHref,
      seasonHref,
      socialHref: redditHref,
      subTabLabel: "Reddit Analytics",
      subTabHref: redditHref,
    });
    return items.map((item) =>
      item.label === "Shows"
        ? { ...item, href: "/shows" }
        : item,
    );
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
  const seasonLinks = SEASON_TABS.map((tab) => ({
    key: tab.tab,
    label: tab.label,
    href:
      hasSeasonContext && showSlug
        ? buildSeasonAdminUrl({
            showSlug,
            seasonNumber: seasonNumber!,
            tab: tab.tab,
          })
        : null,
    isActive: tab.tab === "social",
  }));
  const socialLinks = SOCIAL_TABS.map((tab) => ({
    key: tab.view,
    label: tab.label,
    href:
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
          : null,
    isActive: tab.view === "reddit",
  }));

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
      <RedditAdminShell
        breadcrumbs={breadcrumbItems}
        title={pageTitle}
        backHref={effectiveBackHref}
        seasonLinks={seasonLinks}
        socialLinks={socialLinks}
      >
        <section className="rounded-3xl border border-zinc-200/80 bg-white/95 p-6 shadow-sm">
          <RedditSourcesManager
            mode="global"
            showSlug={showSlug ?? undefined}
            seasonId={canonicalSeasonId}
            seasonNumber={canonicalSeasonNumber}
            initialCommunityId={initialCommunityKey}
            hideCommunityList
            backHref={redditHref}
            episodeDiscussionsPlacement="inline"
            enableEpisodeSync
            onCommunityContextChange={setCommunityContext}
          />
        </section>
      </RedditAdminShell>
    </ClientOnly>
  );
}
