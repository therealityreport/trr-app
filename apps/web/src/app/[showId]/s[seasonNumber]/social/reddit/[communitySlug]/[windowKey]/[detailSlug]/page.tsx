import PublicRouteShell, { formatRouteValue } from "@/components/public/PublicRouteShell";
import PrefixedPathValue from "@/components/public/PrefixedPathValue";

type LegacySeasonRedditDetailPageProps = {
  params: Promise<{
    showId: string;
    seasonNumber: string;
    communitySlug: string;
    windowKey: string;
    detailSlug: string;
  }>;
};

export default async function LegacySeasonRedditDetailPage({ params }: LegacySeasonRedditDetailPageProps) {
  const { showId, seasonNumber, communitySlug, windowKey, detailSlug } = await params;

  return (
    <PublicRouteShell
      eyebrow="Legacy Reddit Detail"
      title="Public legacy Reddit detail route"
      description="This legacy Reddit detail route no longer renders the admin detail workspace."
      details={[
        { label: "Show", value: formatRouteValue(showId) },
        { label: "Season", value: <PrefixedPathValue fallback={seasonNumber} prefix="s" segmentIndex={1} /> },
        { label: "Community", value: formatRouteValue(communitySlug) },
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
