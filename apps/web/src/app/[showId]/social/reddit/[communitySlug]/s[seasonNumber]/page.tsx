import PublicRouteShell, { formatRouteValue } from "@/components/public/PublicRouteShell";

type RedditSeasonCommunityPageProps = {
  params: Promise<{ showId: string; communitySlug: string; seasonNumber: string }>;
};

export default async function RedditSeasonCommunityPage({ params }: RedditSeasonCommunityPageProps) {
  const { showId, communitySlug, seasonNumber } = await params;

  return (
    <PublicRouteShell
      eyebrow="Reddit Community"
      title="Public season Reddit community route"
      description="This public season-scoped Reddit route no longer imports the admin community workspace."
      details={[
        { label: "Show", value: formatRouteValue(showId) },
        { label: "Community", value: formatRouteValue(communitySlug) },
        { label: "Season", value: formatRouteValue(seasonNumber) },
      ]}
      links={[
        { href: `/${showId}/social`, label: "Show social" },
        { href: "/social-media", label: "Social media" },
      ]}
    />
  );
}
