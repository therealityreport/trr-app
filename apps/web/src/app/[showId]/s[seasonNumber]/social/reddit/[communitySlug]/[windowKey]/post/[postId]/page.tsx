import PublicRouteShell, { formatRouteValue } from "@/components/public/PublicRouteShell";
import PrefixedPathValue from "@/components/public/PrefixedPathValue";

type LegacySeasonRedditPostPageProps = {
  params: Promise<{
    showId: string;
    seasonNumber: string;
    communitySlug: string;
    windowKey: string;
    postId: string;
  }>;
};

export default async function LegacySeasonRedditPostPage({ params }: LegacySeasonRedditPostPageProps) {
  const { showId, seasonNumber, communitySlug, windowKey, postId } = await params;

  return (
    <PublicRouteShell
      eyebrow="Legacy Reddit Post"
      title="Public legacy Reddit post route"
      description="This legacy Reddit post route no longer renders the admin post details workspace."
      details={[
        { label: "Show", value: formatRouteValue(showId) },
        { label: "Season", value: <PrefixedPathValue fallback={seasonNumber} prefix="s" segmentIndex={1} /> },
        { label: "Community", value: formatRouteValue(communitySlug) },
        { label: "Window", value: formatRouteValue(windowKey) },
        { label: "Post", value: formatRouteValue(postId) },
      ]}
      links={[
        { href: `/${showId}/social`, label: "Show social" },
        { href: "/social-media", label: "Social media" },
      ]}
    />
  );
}
