import PublicRouteShell, { formatRouteValue } from "@/components/public/PublicRouteShell";

type RedditCommunityPageProps = {
  params: Promise<{ showId: string; communitySlug: string }>;
};

export default async function RedditCommunityPage({ params }: RedditCommunityPageProps) {
  const { showId, communitySlug } = await params;

  return (
    <PublicRouteShell
      eyebrow="Reddit Community"
      title="Public Reddit community route"
      description="This public Reddit route no longer renders the admin community workspace."
      details={[
        { label: "Show", value: formatRouteValue(showId) },
        { label: "Community", value: formatRouteValue(communitySlug) },
      ]}
      links={[
        { href: `/${showId}/social`, label: "Show social" },
        { href: "/social-media", label: "Social media" },
      ]}
    />
  );
}
