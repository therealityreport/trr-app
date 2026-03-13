import PublicRouteShell, { formatRouteValue } from "@/components/public/PublicRouteShell";

type ShowSettingsPageProps = {
  params: Promise<{ showId: string }>;
};

export default async function ShowSettingsPage({ params }: ShowSettingsPageProps) {
  const { showId } = await params;

  return (
    <PublicRouteShell
      eyebrow="Show Settings"
      title="Public show settings route"
      description="This route no longer renders the admin show settings surface. Administrative settings remain under /admin."
      details={[{ label: "Show", value: formatRouteValue(showId) }]}
      links={[
        { href: `/shows/${showId}`, label: "Show overview" },
        { href: `/${showId}/social`, label: "Show social" },
      ]}
    />
  );
}
