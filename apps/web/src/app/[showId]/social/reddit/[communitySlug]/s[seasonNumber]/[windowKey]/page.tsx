import PublicRouteShell, { formatRouteValue } from "@/components/public/PublicRouteShell";

type RedditSeasonWindowPageProps = {
  params: Promise<{ showId: string; communitySlug: string; seasonNumber: string; windowKey: string }>;
};

export default async function RedditSeasonWindowPage({ params }: RedditSeasonWindowPageProps) {
  const { showId, communitySlug, seasonNumber, windowKey } = await params;

  return (
    <PublicRouteShell
      eyebrow="Reddit Window"
      title="Public season Reddit window route"
      description="This public season Reddit window route no longer imports the admin post browser."
      details={[
        { label: "Show", value: formatRouteValue(showId) },
        { label: "Community", value: formatRouteValue(communitySlug) },
        { label: "Season", value: formatRouteValue(seasonNumber) },
        { label: "Window", value: formatRouteValue(windowKey) },
      ]}
      links={[
        { href: `/${showId}/social`, label: "Show social" },
        { href: "/social-media", label: "Social media" },
      ]}
    />
  );
}
