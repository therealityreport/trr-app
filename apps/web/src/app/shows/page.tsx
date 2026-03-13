import PublicRouteShell from "@/components/public/PublicRouteShell";

export default function ShowsPage() {
  return (
    <PublicRouteShell
      eyebrow="Shows"
      title="Shows"
      description="This public entry point is now separated from the TRR admin show index. Public show detail routes can be reached directly without loading admin controls."
      links={[
        { href: "/", label: "Home" },
        { href: "/social-media", label: "Social media" },
      ]}
    />
  );
}
