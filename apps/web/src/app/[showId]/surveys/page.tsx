import PublicRouteShell, { formatRouteValue } from "@/components/public/PublicRouteShell";

type ShowSurveysPageProps = {
  params: Promise<{ showId: string }>;
};

export default async function ShowSurveysPage({ params }: ShowSurveysPageProps) {
  const { showId } = await params;

  return (
    <PublicRouteShell
      eyebrow="Show Surveys"
      title="Public show surveys route"
      description="This public route is isolated from the admin survey editor and stays reachable without admin auth."
      details={[{ label: "Show", value: formatRouteValue(showId) }]}
      links={[
        { href: `/shows/${showId}`, label: "Show overview" },
        { href: "/social-media", label: "Social media" },
      ]}
    />
  );
}
