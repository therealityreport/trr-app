import ShowAdminPage from "@/app/admin/trr-shows/[showId]/page";
import SeasonAdminPage from "@/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page";
import { redirect } from "next/navigation";
import type { Route } from "next";

export const dynamic = "force-dynamic";

interface RootShowSeasonAliasPageProps {
  params: Promise<{ showId: string; seasonNumber: string; rest?: string[] }>;
}

const isStrictSeasonNumber = (value: string): boolean => /^[0-9]{1,3}$/.test(value);
const isSeasonToken = (value: string): boolean => /^s\d{1,3}$/i.test(value);
const decodeSegment = (value: string | null | undefined): string =>
  typeof value === "string" ? decodeURIComponent(value).trim() : "";

const resolveRedditWindowRedirectHref = ({
  showId,
  rest,
}: {
  showId: string;
  rest: string[] | undefined;
}): string | null => {
  const segments = Array.isArray(rest)
    ? rest.map((segment) => decodeSegment(segment)).filter((segment) => segment.length > 0)
    : [];
  if (segments.length < 3) return null;
  if (segments[0]?.toLowerCase() !== "reddit") return null;

  const communitySlug = segments[1] ?? "";
  if (!communitySlug) return null;

  let season: string | null = null;
  let windowKey: string | null = null;

  if (isSeasonToken(segments[2] ?? "")) {
    season = (segments[2] ?? "").slice(1);
    if ((segments[3] ?? "").length > 0) {
      windowKey = segments[3] ?? null;
    } else {
      const query = new URLSearchParams({
        showSlug: showId,
        season,
      });
      return `/admin/social-media/reddit/${encodeURIComponent(communitySlug)}?${query.toString()}`;
    }
  } else {
    windowKey = segments[2] ?? null;
  }

  if (!windowKey) return null;

  const query = new URLSearchParams({
    showSlug: showId,
    community_slug: communitySlug,
    windowKey,
  });
  if (season) {
    query.set("season", season);
  }
  return `/admin/reddit-window-posts?${query.toString()}`;
};

export default async function RootShowSeasonAliasPage({
  params,
}: RootShowSeasonAliasPageProps) {
  const { showId, seasonNumber, rest } = await params;
  const normalizedSeasonNumber =
    typeof seasonNumber === "string" ? seasonNumber.trim() : "";
  if (isStrictSeasonNumber(normalizedSeasonNumber)) {
    return <SeasonAdminPage />;
  }

  const redditWindowRedirectHref = resolveRedditWindowRedirectHref({
    showId,
    rest,
  });
  if (redditWindowRedirectHref) {
    redirect(redditWindowRedirectHref as Route);
  }

  return <ShowAdminPage />;
}
