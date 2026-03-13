import PublicRouteShell, { formatRouteValue } from "@/components/public/PublicRouteShell";
import PrefixedPathValue from "@/components/public/PrefixedPathValue";
import { resolvePrefixedRouteParam } from "@/lib/public/prefixed-route-params";

export const dynamic = "force-dynamic";

type ShowWeekPageProps = {
  params: Promise<{ showId: string; seasonNumber: string; weekIndex: string }>;
};

export default async function RootShowSeasonWeekDetailPage({ params }: ShowWeekPageProps) {
  const resolvedParams = await params;
  const showId = resolvedParams.showId;
  const seasonNumber = resolvePrefixedRouteParam(resolvedParams, "seasonNumber", "s");
  const weekIndex = resolvePrefixedRouteParam(resolvedParams, "weekIndex", "w");

  return (
    <PublicRouteShell
      eyebrow="Weekly Social"
      title="Public weekly social route"
      description="This route no longer lazy-loads the admin weekly social workspace. Public weekly pages remain reachable without admin auth."
      details={[
        { label: "Show", value: formatRouteValue(showId) },
        { label: "Season", value: <PrefixedPathValue fallback={seasonNumber} prefix="s" segmentIndex={1} /> },
        { label: "Week", value: <PrefixedPathValue fallback={weekIndex} prefix="w" segmentIndex={3} /> },
      ]}
      links={[
        { href: `/${showId}/social`, label: "Show social" },
        { href: "/social-media", label: "Social media" },
      ]}
    />
  );
}
