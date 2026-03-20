import PublicRouteShell, { formatRouteValue } from "@/components/public/PublicRouteShell";

export const dynamic = "force-dynamic";

type PersonPageProps = {
  params: Promise<{ personId: string; personTab?: string[] }>;
};

export default async function PersonPage({ params }: PersonPageProps) {
  const { personId, personTab } = await params;

  return (
    <PublicRouteShell
      eyebrow="Person"
      title={formatRouteValue(personId)}
      description="This public person route no longer redirects into the admin people workspace. Public traffic stays on public-safe pages while admin editing remains under the admin surface."
      details={[
        { label: "Person", value: formatRouteValue(personId) },
        { label: "Subroute", value: formatRouteValue(personTab) },
      ]}
      links={[
        { href: "/people", label: "People home" },
        { href: "/profile", label: "Your profile" },
      ]}
    />
  );
}
