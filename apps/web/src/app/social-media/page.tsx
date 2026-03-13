import PublicRouteShell from "@/components/public/PublicRouteShell";

export default function SocialMediaPage() {
  return (
    <PublicRouteShell
      eyebrow="Social"
      title="Social Media"
      description="This public route no longer renders the admin social dashboard. Public-facing social views are now isolated from admin tooling and auth gates."
      links={[
        { href: "/", label: "Home" },
        { href: "/shows", label: "Browse shows" },
      ]}
    />
  );
}
