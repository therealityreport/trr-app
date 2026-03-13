import PublicRouteShell, { formatRouteValue } from "@/components/public/PublicRouteShell";

type RedditSeasonDetailPageProps = {
  params: Promise<{
    showId: string;
    communitySlug: string;
    seasonNumber: string;
    windowKey: string;
    detailSlug: string;
  }>;
};

export default async function RedditSeasonDetailPage({ params }: RedditSeasonDetailPageProps) {
  const { showId, communitySlug, seasonNumber, windowKey, detailSlug } = await params;

  return (
    <PublicRouteShell
      eyebrow="Reddit Detail"
      title="Public season Reddit detail route"
      description="This season-scoped Reddit detail route no longer renders the admin detail workspace."
      details={[
        { label: "Show", value: formatRouteValue(showId) },
        { label: "Community", value: formatRouteValue(communitySlug) },
        { label: "Season", value: formatRouteValue(seasonNumber) },
        { label: "Window", value: formatRouteValue(windowKey) },
        { label: "Detail", value: formatRouteValue(detailSlug) },
      ]}
      links={[
        { href: `/${showId}/social`, label: "Show social" },
        { href: "/social-media", label: "Social media" },
      ]}
    />
  );
}
