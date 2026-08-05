import type { Metadata } from "next";

import {
  absolutePublicCanonicalUrl,
  personIdentityContext,
  publicRoutePath,
  redirectToCanonicalPublicPath,
  requestedPublicRoutePath,
  resolvePublicIdentityForRoute,
  type PublicPersonSearchParams,
} from "@/app/_lib/public-identity-route";
import PublicRouteShell, { formatRouteValue } from "@/components/public/PublicRouteShell";
import { resolvePublicPersonIdentity } from "@/lib/server/trr-api/public-identities";

export const dynamic = "force-dynamic";

type PersonPageProps = {
  params: Promise<{ personId: string; personTab?: string[] }>;
  searchParams?: Promise<PublicPersonSearchParams>;
};

async function resolvePerson({ params, searchParams }: PersonPageProps) {
  const { personId, personTab } = await params;
  const identityContext = personIdentityContext(searchParams ? await searchParams : undefined);
  const identity = await resolvePublicIdentityForRoute(() =>
    resolvePublicPersonIdentity(personId, identityContext),
  );
  const canonicalPath = publicRoutePath(identity.canonical_path, personTab);
  return { canonicalPath, identity, identityContext, personId, personTab };
}

export async function generateMetadata(props: PersonPageProps): Promise<Metadata> {
  const { canonicalPath, identity } = await resolvePerson(props);
  return {
    title: `${identity.full_name} | The Reality Report`,
    alternates: {
      canonical: absolutePublicCanonicalUrl(canonicalPath),
    },
  };
}

export default async function PersonPage({ params, searchParams }: PersonPageProps) {
  const { canonicalPath, identity, identityContext, personId, personTab } = await resolvePerson(
    {
      params,
      searchParams,
    },
  );
  redirectToCanonicalPublicPath(
    requestedPublicRoutePath(["people", personId], personTab),
    canonicalPath,
    identityContext !== undefined,
  );

  return (
    <PublicRouteShell
      eyebrow="Person"
      title={identity.full_name}
      description={`Explore ${identity.full_name} on The Reality Report.`}
      details={[
        { label: "Person", value: identity.full_name },
        { label: "Subroute", value: formatRouteValue(personTab) },
        ...(identity.show_context
          ? [{ label: "Show context", value: identity.show_context.show_name }]
          : []),
      ]}
      links={[
        { href: "/people", label: "People home" },
        ...(identity.show_context
          ? [{ href: `/shows/${identity.show_context.canonical_slug}`, label: "Show page" }]
          : []),
        { href: "/profile", label: "Your profile" },
      ]}
    />
  );
}
