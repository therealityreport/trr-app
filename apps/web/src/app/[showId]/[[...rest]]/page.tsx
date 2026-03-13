import PublicRouteShell, { formatRouteValue } from "@/components/public/PublicRouteShell";

export const dynamic = "force-dynamic";

type ShowCatchAllPageProps = {
  params: Promise<{ showId: string; rest?: string[] }>;
};

export default async function ShowCatchAllPage({ params }: ShowCatchAllPageProps) {
  const { showId, rest } = await params;

  return (
    <PublicRouteShell
      eyebrow="Show Route"
      title="Public show route"
      description="This catch-all route no longer falls through to the admin show page. Unmatched public show paths stay public-safe."
      details={[
        { label: "Show", value: formatRouteValue(showId) },
        { label: "Subpath", value: formatRouteValue(rest) },
      ]}
      links={[
        { href: `/shows/${showId}`, label: "Show overview" },
        { href: `/${showId}/social`, label: "Show social" },
      ]}
    />
  );
}
