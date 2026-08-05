import type { Metadata } from "next";

import {
  absolutePublicCanonicalUrl,
  redirectToCanonicalPublicPath,
  requestedPublicRoutePath,
  resolvePublicIdentityForRoute,
} from "@/app/_lib/public-identity-route";
import PublicRouteShell from "@/components/public/PublicRouteShell";
import { resolvePublicShowIdentity } from "@/lib/server/trr-api/public-identities";

type ShowPageProps = {
  params: Promise<{ showId: string }>;
};

async function resolveShow({ params }: ShowPageProps) {
  const { showId } = await params;
  const identity = await resolvePublicIdentityForRoute(() => resolvePublicShowIdentity(showId));
  return { identity, showId };
}

export async function generateMetadata(props: ShowPageProps): Promise<Metadata> {
  const { identity } = await resolveShow(props);
  return {
    title: `${identity.show_name} | The Reality Report`,
    alternates: {
      canonical: absolutePublicCanonicalUrl(identity.canonical_path),
    },
  };
}

export default async function ShowPage({ params }: ShowPageProps) {
  const { identity, showId } = await resolveShow({ params });
  redirectToCanonicalPublicPath(
    requestedPublicRoutePath(["shows", showId]),
    identity.canonical_path,
  );

  return (
    <PublicRouteShell
      eyebrow="Show"
      title={identity.show_name}
      description={`Explore ${identity.show_name} on The Reality Report.`}
      details={[
        { label: "Show", value: identity.show_name },
        { label: "Canonical URL", value: identity.canonical_path },
      ]}
      links={[
        { href: "/shows", label: "All shows" },
        { href: `/${identity.canonical_slug}/social`, label: "Show social" },
      ]}
    />
  );
}
