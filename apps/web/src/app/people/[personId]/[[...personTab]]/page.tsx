import PublicRouteShell, { formatRouteValue } from "@/components/public/PublicRouteShell";

type PersonPageProps = {
  params: Promise<{ personId: string; personTab?: string[] }>;
};

export default async function PersonPage({ params }: PersonPageProps) {
  const { personId, personTab } = await params;

  return (
    <PublicRouteShell
      eyebrow="Person"
      title="Public person route"
      description="This public person route no longer renders the admin person workspace. Admin-specific media tools remain scoped to /admin."
      details={[
        { label: "Person", value: formatRouteValue(personId) },
        { label: "Tab", value: formatRouteValue(personTab) },
      ]}
      links={[
        { href: "/shows", label: "Browse shows" },
        { href: "/social-media", label: "Social media" },
      ]}
    />
  );
}
