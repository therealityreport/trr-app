import { redirect } from "next/navigation";
import type { Route } from "next";
import PublicRouteShell, { formatRouteValue } from "@/components/public/PublicRouteShell";
import PrefixedPathValue from "@/components/public/PrefixedPathValue";
import { resolvePrefixedRouteParam } from "@/lib/public/prefixed-route-params";

export const dynamic = "force-dynamic";

interface RootShowSeasonAliasPageProps {
  params: Promise<{ showId: string; seasonNumber: string; rest?: string[] }>;
}

const isStrictSeasonNumber = (value: string): boolean => /^[0-9]{1,3}$/.test(value);
const isSeasonToken = (value: string): boolean => /^s\d{1,3}$/i.test(value);
const decodeSegment = (value: string | null | undefined): string =>
  typeof value === "string" ? decodeURIComponent(value).trim() : "";

interface RedditPathContext {
  communitySlug: string;
  season: string | null;
  windowKey: string | null;
  postId: string | null;
  detailSlug: string | null;
}

const resolveRedditPathContext = ({
  rest,
}: {
  rest: string[] | undefined;
}): RedditPathContext | null => {
  const segments = Array.isArray(rest)
    ? rest.map((segment) => decodeSegment(segment)).filter((segment) => segment.length > 0)
    : [];
  if (segments.length < 3) return null;
  if (segments[0]?.toLowerCase() !== "reddit") return null;

  const communitySlug = segments[1] ?? "";
  if (!communitySlug) return null;

  let season: string | null = null;
  let windowKey: string | null = null;
  let postId: string | null = null;
  let detailSlug: string | null = null;

  if (isSeasonToken(segments[2] ?? "")) {
    season = (segments[2] ?? "").slice(1);
    if ((segments[3] ?? "").length > 0) {
      windowKey = segments[3] ?? null;
    }
    if ((segments[4] ?? "").toLowerCase() === "post" && (segments[5] ?? "").length > 0) {
      postId = segments[5] ?? null;
    } else if ((segments[4] ?? "").length > 0) {
      detailSlug = segments[4] ?? null;
    }
  } else {
    windowKey = segments[2] ?? null;
    if ((segments[3] ?? "").toLowerCase() === "post" && (segments[4] ?? "").length > 0) {
      postId = segments[4] ?? null;
    } else if ((segments[3] ?? "").length > 0) {
      detailSlug = segments[3] ?? null;
    }
  }

  return { communitySlug, season, windowKey, postId, detailSlug };
};

export default async function RootShowSeasonAliasPage({
  params,
}: RootShowSeasonAliasPageProps) {
  const resolvedParams = await params;
  const showId = resolvedParams.showId;
  const rest = resolvedParams.rest;
  const normalizedSeasonNumber = resolvePrefixedRouteParam(resolvedParams, "seasonNumber", "s") ?? "";

  if (isStrictSeasonNumber(normalizedSeasonNumber)) {
    return (
      <PublicRouteShell
        eyebrow="Season Alias"
        title={`Season ${formatRouteValue(normalizedSeasonNumber)}`}
        description="This season alias route is publicly reachable and no longer imports the admin season editor."
        details={[
          { label: "Show", value: formatRouteValue(showId) },
          {
            label: "Season",
            value: <PrefixedPathValue fallback={normalizedSeasonNumber} prefix="s" segmentIndex={1} />,
          },
          { label: "Subroute", value: formatRouteValue(rest) },
        ]}
        links={[
          { href: `/${showId}`, label: "Show page" },
          { href: `/${showId}/s${normalizedSeasonNumber}/social`, label: "Season social" },
        ]}
      />
    );
  }

  const ctx = resolveRedditPathContext({ rest });
  if (ctx?.season && !ctx.windowKey && !ctx.postId && !ctx.detailSlug) {
    redirect(
      `/${encodeURIComponent(showId)}/social/reddit/${encodeURIComponent(ctx.communitySlug)}/s${ctx.season}` as Route,
    );
  }

  if (ctx?.windowKey && (ctx.postId || ctx.detailSlug)) {
    return (
      <PublicRouteShell
        eyebrow="Reddit Alias"
        title="Public reddit detail alias route"
        description="This season alias no longer renders the admin reddit detail page for public traffic."
        details={[
          { label: "Show", value: formatRouteValue(showId) },
          {
            label: "Season token",
            value: <PrefixedPathValue fallback={normalizedSeasonNumber} prefix="s" segmentIndex={1} />,
          },
          { label: "Community", value: formatRouteValue(ctx.communitySlug) },
          { label: "Window", value: formatRouteValue(ctx.windowKey) },
          { label: "Detail", value: formatRouteValue(ctx.postId ?? ctx.detailSlug) },
        ]}
        links={[
          { href: `/${showId}/social/reddit/${ctx.communitySlug}/${ctx.windowKey}`, label: "Window route" },
          { href: `/${showId}/social`, label: "Show social" },
        ]}
      />
    );
  }

  if (ctx?.windowKey) {
    return (
      <PublicRouteShell
        eyebrow="Reddit Alias"
        title="Public reddit window alias route"
        description="This season alias no longer renders the admin reddit window workspace for public traffic."
        details={[
          { label: "Show", value: formatRouteValue(showId) },
          {
            label: "Season token",
            value: <PrefixedPathValue fallback={normalizedSeasonNumber} prefix="s" segmentIndex={1} />,
          },
          { label: "Community", value: formatRouteValue(ctx.communitySlug) },
          { label: "Window", value: formatRouteValue(ctx.windowKey) },
        ]}
        links={[
          { href: `/${showId}/social/reddit/${ctx.communitySlug}/${ctx.windowKey}`, label: "Window route" },
          { href: `/${showId}/social/reddit/${ctx.communitySlug}`, label: "Community route" },
        ]}
      />
    );
  }

  return (
    <PublicRouteShell
      eyebrow="Season Alias"
      title="Public show alias route"
      description="This show-season alias route no longer re-exports admin show pages. Public aliases remain reachable without admin auth."
      details={[
        { label: "Show", value: formatRouteValue(showId) },
        {
          label: "Season token",
          value: <PrefixedPathValue fallback={normalizedSeasonNumber} prefix="s" segmentIndex={1} />,
        },
        { label: "Subroute", value: formatRouteValue(rest) },
      ]}
      links={[
        { href: `/${showId}`, label: "Show page" },
        { href: `/${showId}/social`, label: "Show social" },
      ]}
    />
  );
}
