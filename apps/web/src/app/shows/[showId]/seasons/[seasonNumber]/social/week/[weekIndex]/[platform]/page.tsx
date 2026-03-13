import PublicRouteShell, { formatRouteValue } from "@/components/public/PublicRouteShell";

export const dynamic = "force-dynamic";

type ShowSeasonWeekPlatformPageProps = {
  params: Promise<{ showId: string; seasonNumber: string; weekIndex: string; platform: string }>;
};

export default async function ShowSeasonWeekPlatformPage({
  params,
}: ShowSeasonWeekPlatformPageProps) {
  const { showId, seasonNumber, weekIndex, platform } = await params;

  return (
    <PublicRouteShell
      eyebrow="Weekly Social"
      title="Public platform week route"
      description="This public week/platform route now renders without importing the admin weekly detail loader."
      details={[
        { label: "Show", value: formatRouteValue(showId) },
        { label: "Season", value: formatRouteValue(seasonNumber) },
        { label: "Week", value: formatRouteValue(weekIndex) },
        { label: "Platform", value: formatRouteValue(platform) },
      ]}
      links={[
        { href: `/shows/${showId}/seasons/${seasonNumber}/social/week/${weekIndex}`, label: "Week page" },
        { href: `/${showId}/s${seasonNumber}/social/w${weekIndex}/${platform}`, label: "Show alias route" },
      ]}
    />
  );
}
