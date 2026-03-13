import PublicRouteShell, { formatRouteValue } from "@/components/public/PublicRouteShell";

type ShowSeasonPageProps = {
  params: Promise<{ showId: string; seasonNumber: string }>;
};

export default async function ShowSeasonPage({ params }: ShowSeasonPageProps) {
  const { showId, seasonNumber } = await params;

  return (
    <PublicRouteShell
      eyebrow="Season"
      title={`Season ${formatRouteValue(seasonNumber)}`}
      description="This public season route no longer re-exports the admin season editor. Admin-only editing stays under /admin while public season URLs remain reachable."
      details={[
        { label: "Show", value: formatRouteValue(showId) },
        { label: "Season", value: formatRouteValue(seasonNumber) },
      ]}
      links={[
        { href: `/shows/${showId}`, label: "Show page" },
        { href: `/shows/${showId}/seasons/${seasonNumber}/social/week/1`, label: "Season social" },
      ]}
    />
  );
}
