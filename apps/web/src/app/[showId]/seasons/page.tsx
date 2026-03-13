import PublicRouteShell, { formatRouteValue } from "@/components/public/PublicRouteShell";

type ShowSeasonsPageProps = {
  params: Promise<{ showId: string }>;
};

export default async function ShowSeasonsPage({ params }: ShowSeasonsPageProps) {
  const { showId } = await params;

  return (
    <PublicRouteShell
      eyebrow="Show Seasons"
      title="Public season index route"
      description="This route no longer imports the admin show workspace. Season-level public views are separated from admin tooling."
      details={[{ label: "Show", value: formatRouteValue(showId) }]}
      links={[
        { href: `/shows/${showId}`, label: "Show overview" },
        { href: `/${showId}/social`, label: "Show social" },
      ]}
    />
  );
}
