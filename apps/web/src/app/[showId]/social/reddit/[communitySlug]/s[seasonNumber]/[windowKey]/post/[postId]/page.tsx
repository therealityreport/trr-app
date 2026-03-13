import PublicRouteShell, { formatRouteValue } from "@/components/public/PublicRouteShell";

type RedditSeasonPostPageProps = {
  params: Promise<{
    showId: string;
    communitySlug: string;
    seasonNumber: string;
    windowKey: string;
    postId: string;
  }>;
};

export default async function RedditSeasonPostPage({ params }: RedditSeasonPostPageProps) {
  const { showId, communitySlug, seasonNumber, windowKey, postId } = await params;

  return (
    <PublicRouteShell
      eyebrow="Reddit Post"
      title="Public season Reddit post route"
      description="This season-scoped Reddit post route no longer imports the admin post details page."
      details={[
        { label: "Show", value: formatRouteValue(showId) },
        { label: "Community", value: formatRouteValue(communitySlug) },
        { label: "Season", value: formatRouteValue(seasonNumber) },
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
