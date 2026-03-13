import PublicRouteShell, { formatRouteValue } from "@/components/public/PublicRouteShell";

type RedditWindowPageProps = {
  params: Promise<{ showId: string; communitySlug: string; windowKey: string }>;
};

export default async function RedditWindowPage({ params }: RedditWindowPageProps) {
  const { showId, communitySlug, windowKey } = await params;

  return (
    <PublicRouteShell
      eyebrow="Reddit Window"
      title="Public Reddit window route"
      description="This public Reddit window route no longer renders the admin post browser."
      details={[
        { label: "Show", value: formatRouteValue(showId) },
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
