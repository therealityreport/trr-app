import PublicRouteShell, { formatRouteValue } from "@/components/public/PublicRouteShell";
import PrefixedPathValue from "@/components/public/PrefixedPathValue";

type LegacySeasonRedditCommunityPageProps = {
  params: Promise<{ showId: string; seasonNumber: string; communitySlug: string }>;
};

export default async function LegacySeasonRedditCommunityPage({ params }: LegacySeasonRedditCommunityPageProps) {
  const { showId, seasonNumber, communitySlug } = await params;

  return (
    <PublicRouteShell
      eyebrow="Legacy Reddit"
      title="Public legacy season Reddit route"
      description="This legacy season Reddit route no longer resolves to an admin community page."
      details={[
        { label: "Show", value: formatRouteValue(showId) },
        { label: "Season", value: <PrefixedPathValue fallback={seasonNumber} prefix="s" segmentIndex={1} /> },
        { label: "Community", value: formatRouteValue(communitySlug) },
      ]}
      links={[
        { href: `/${showId}/social`, label: "Show social" },
        { href: "/social-media", label: "Social media" },
      ]}
    />
  );
}
