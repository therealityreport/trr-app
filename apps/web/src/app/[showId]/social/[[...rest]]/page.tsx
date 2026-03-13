import PublicRouteShell, { formatRouteValue } from "@/components/public/PublicRouteShell";

export const dynamic = "force-dynamic";

type ShowSocialCatchAllPageProps = {
  params: Promise<{ showId: string; rest?: string[] }>;
};

export default async function ShowSocialCatchAllPage({ params }: ShowSocialCatchAllPageProps) {
  const { showId, rest } = await params;

  return (
    <PublicRouteShell
      eyebrow="Show Social"
      title="Public show social route"
      description="This public social catch-all route no longer resolves to the admin show workspace. Public social navigation stays outside admin auth."
      details={[
        { label: "Show", value: formatRouteValue(showId) },
        { label: "Subpath", value: formatRouteValue(rest) },
      ]}
      links={[
        { href: `/shows/${showId}`, label: "Show overview" },
        { href: "/social-media", label: "Social media" },
      ]}
    />
  );
}
