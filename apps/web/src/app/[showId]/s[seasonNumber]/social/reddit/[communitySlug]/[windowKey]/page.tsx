import PublicRouteShell, { formatRouteValue } from "@/components/public/PublicRouteShell";
import PrefixedPathValue from "@/components/public/PrefixedPathValue";

type LegacySeasonRedditWindowPageProps = {
  params: Promise<{ showId: string; seasonNumber: string; communitySlug: string; windowKey: string }>;
};

export default async function LegacySeasonRedditWindowPage({ params }: LegacySeasonRedditWindowPageProps) {
  const { showId, seasonNumber, communitySlug, windowKey } = await params;

  return (
    <PublicRouteShell
      eyebrow="Legacy Reddit Window"
      title="Public legacy Reddit window route"
      description="This legacy Reddit window route no longer renders the admin window browser."
      details={[
        { label: "Show", value: formatRouteValue(showId) },
        { label: "Season", value: <PrefixedPathValue fallback={seasonNumber} prefix="s" segmentIndex={1} /> },
        { label: "Community", value: formatRouteValue(communitySlug) },
        { label: "Window", value: formatRouteValue(windowKey) },
      ]}
      links={[
        { href: `/${showId}/social`, label: "Show social" },
        { href: "/social-media", label: "Social media" },
      ]}
    />
  );
}
