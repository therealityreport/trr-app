import PublicRouteShell, { formatRouteValue } from "@/components/public/PublicRouteShell";

type RedditPostPageProps = {
  params: Promise<{ showId: string; communitySlug: string; windowKey: string; postId: string }>;
};

export default async function RedditPostPage({ params }: RedditPostPageProps) {
  const { showId, communitySlug, windowKey, postId } = await params;

  return (
    <PublicRouteShell
      eyebrow="Reddit Post"
      title="Public Reddit post route"
      description="This public Reddit post route no longer renders the admin post details workspace."
      details={[
        { label: "Show", value: formatRouteValue(showId) },
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
