import PublicRouteShell, { formatRouteValue } from "@/components/public/PublicRouteShell";

export const dynamic = "force-dynamic";

type ShowSeasonWeekPageProps = {
  params: Promise<{ showId: string; seasonNumber: string; weekIndex: string }>;
};

export default async function ShowSeasonWeekPage({ params }: ShowSeasonWeekPageProps) {
  const { showId, seasonNumber, weekIndex } = await params;

  return (
    <PublicRouteShell
      eyebrow="Weekly Social"
      title="Public season week route"
      description="This season-scoped weekly social route no longer lazy-loads the admin weekly social workspace."
      details={[
        { label: "Show", value: formatRouteValue(showId) },
        { label: "Season", value: formatRouteValue(seasonNumber) },
        { label: "Week", value: formatRouteValue(weekIndex) },
      ]}
      links={[
        { href: `/shows/${showId}/seasons/${seasonNumber}`, label: "Season page" },
        { href: `/${showId}/s${seasonNumber}/social/w${weekIndex}`, label: "Show alias route" },
      ]}
    />
  );
}
