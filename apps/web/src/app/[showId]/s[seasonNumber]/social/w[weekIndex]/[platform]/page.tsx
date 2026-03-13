import PublicRouteShell, { formatRouteValue } from "@/components/public/PublicRouteShell";
import PrefixedPathValue from "@/components/public/PrefixedPathValue";
import { resolvePrefixedRouteParam } from "@/lib/public/prefixed-route-params";

export const dynamic = "force-dynamic";

type ShowWeekPlatformPageProps = {
  params: Promise<{ showId: string; seasonNumber: string; weekIndex: string; platform: string }>;
};

export default async function RootShowSeasonWeekPlatformDetailPage({ params }: ShowWeekPlatformPageProps) {
  const resolvedParams = await params;
  const showId = resolvedParams.showId;
  const seasonNumber = resolvePrefixedRouteParam(resolvedParams, "seasonNumber", "s");
  const weekIndex = resolvePrefixedRouteParam(resolvedParams, "weekIndex", "w");
  const platform = resolvedParams.platform;

  return (
    <PublicRouteShell
      eyebrow="Weekly Platform"
      title="Public weekly platform route"
      description="This route no longer lazy-loads admin-only weekly platform analytics."
      details={[
        { label: "Show", value: formatRouteValue(showId) },
        { label: "Season", value: <PrefixedPathValue fallback={seasonNumber} prefix="s" segmentIndex={1} /> },
        { label: "Week", value: <PrefixedPathValue fallback={weekIndex} prefix="w" segmentIndex={3} /> },
        { label: "Platform", value: formatRouteValue(platform) },
      ]}
      links={[
        { href: `/${showId}/social`, label: "Show social" },
        { href: "/social-media", label: "Social media" },
      ]}
    />
  );
}
