import PublicRouteShell, { formatRouteValue } from "@/components/public/PublicRouteShell";

type OfficialSeasonRedditCommunityPageProps = {
  params: Promise<{ showId: string; communitySlug: string; seasonNumber: string }>;
};

export default async function OfficialSeasonRedditCommunityPage({
  params,
}: OfficialSeasonRedditCommunityPageProps) {
  const { showId, communitySlug, seasonNumber } = await params;

  return (
    <PublicRouteShell
      eyebrow="Official Reddit"
      title="Public official season Reddit route"
      description="This official season Reddit route no longer imports the admin Reddit community workspace."
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
