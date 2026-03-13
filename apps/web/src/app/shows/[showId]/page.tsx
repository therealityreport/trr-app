import PublicRouteShell, { formatRouteValue } from "@/components/public/PublicRouteShell";

type ShowPageProps = {
  params: Promise<{ showId: string }>;
};

export default async function ShowPage({ params }: ShowPageProps) {
  const { showId } = await params;

  return (
    <PublicRouteShell
      eyebrow="Show"
      title={formatRouteValue(showId)}
      description="This public show route no longer imports the admin show editor. Admin-only controls stay under /admin while this route remains publicly reachable."
      details={[{ label: "Show", value: formatRouteValue(showId) }]}
      links={[
        { href: "/shows", label: "All shows" },
        { href: `/${showId}/social`, label: "Show social" },
      ]}
    />
  );
}
