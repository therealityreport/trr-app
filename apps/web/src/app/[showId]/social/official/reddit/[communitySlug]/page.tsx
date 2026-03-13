import PublicRouteShell, { formatRouteValue } from "@/components/public/PublicRouteShell";

type OfficialRedditCommunityPageProps = {
  params: Promise<{ showId: string; communitySlug: string }>;
};

export default async function OfficialRedditCommunityPage({ params }: OfficialRedditCommunityPageProps) {
  const { showId, communitySlug } = await params;

  return (
    <PublicRouteShell
      eyebrow="Official Reddit"
      title="Public official Reddit route"
      description="This official Reddit route no longer resolves to the admin Reddit community page."
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
