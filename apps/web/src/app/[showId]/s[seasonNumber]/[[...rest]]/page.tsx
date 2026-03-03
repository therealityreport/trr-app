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

interface RedditPathContext {
  communitySlug: string;
  season: string | null;
  windowKey: string | null;
  postId: string | null;
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

  if (isSeasonToken(segments[2] ?? "")) {
    season = (segments[2] ?? "").slice(1);
    if ((segments[3] ?? "").length > 0) {
      windowKey = segments[3] ?? null;
    }
    if ((segments[4] ?? "").toLowerCase() === "post" && (segments[5] ?? "").length > 0) {
      postId = segments[5] ?? null;
    }
  } else {
    windowKey = segments[2] ?? null;
    if ((segments[3] ?? "").toLowerCase() === "post" && (segments[4] ?? "").length > 0) {
      postId = segments[4] ?? null;
    }
  }

  return { communitySlug, season, windowKey, postId };
};

export default async function RootShowSeasonAliasPage({
  params,
}: RootShowSeasonAliasPageProps) {
  const { showId, seasonNumber, rest } = await params;
  const normalizedSeasonNumber =
    typeof seasonNumber === "string" ? seasonNumber.trim() : "";
  if (isStrictSeasonNumber(normalizedSeasonNumber)) {
    const { default: SeasonAdminPage } = await import(
      "@/app/admin/trr-shows/[showId]/seasons/[seasonNumber]/page"
    );
    return <SeasonAdminPage />;
  }

  const ctx = resolveRedditPathContext({ rest });
  if (ctx) {
    if (ctx.windowKey && ctx.postId) {
      const { default: AdminRedditPostDetailsPage } = await import(
        "@/app/admin/reddit-post-details/page"
      );
      return <AdminRedditPostDetailsPage />;
    }
    if (ctx.windowKey) {
      // Render the window page directly instead of redirecting to avoid
      // infinite redirect loops.  The catch-all matches "social" as
      // s[seasonNumber] (seasonNumber="ocial"), so redirecting to the
      // show-scoped URL would re-match this same catch-all endlessly.
      // The AdminRedditWindowPostsPage component will parse its context
      // from the pathname via its built-in fallback resolution.
      const { default: AdminRedditWindowPostsPage } = await import(
        "@/app/admin/reddit-window-posts/page"
      );
      return <AdminRedditWindowPostsPage />;
    }
    if (ctx.season) {
      // Community+season redirect (no window key) — the specific route at
      // [showId]/social/reddit/[communitySlug]/s[seasonNumber] handles this.
      redirect(
        `/${encodeURIComponent(showId)}/social/reddit/${encodeURIComponent(ctx.communitySlug)}/s${ctx.season}` as Route,
      );
    }
  }

  const { default: ShowAdminPage } = await import(
    "@/app/admin/trr-shows/[showId]/page"
  );
  return <ShowAdminPage />;
}
