import {
  redirectToCanonicalPublicPath,
  requestedPublicRoutePath,
  resolvePublicIdentityForRoute,
} from "@/app/_lib/public-identity-route";
import { logPublicShowIdentityFailure } from "@/app/_lib/public-identity-diagnostic";
import PublicRouteShell, { formatRouteValue } from "@/components/public/PublicRouteShell";
import { resolvePublicShowIdentity } from "@/lib/server/trr-api/public-identities";

export const dynamic = "force-dynamic";

type ShowCatchAllPageProps = {
  params: Promise<{ showId: string; rest?: string[] }>;
};

export default async function ShowCatchAllPage({ params }: ShowCatchAllPageProps) {
  const { showId, rest } = await params;

  if (!rest?.length) {
    let identity;
    try {
      identity = await resolvePublicIdentityForRoute(() => resolvePublicShowIdentity(showId));
    } catch (error) {
      logPublicShowIdentityFailure(showId, error);
      throw error;
    }
    redirectToCanonicalPublicPath(
      requestedPublicRoutePath([showId]),
      identity.canonical_path,
    );
  }

  return (
    <PublicRouteShell
      eyebrow="Show Route"
      title="Public show route"
      description="This catch-all route no longer falls through to the admin show page. Unmatched public show paths stay public-safe."
      details={[
        { label: "Show", value: formatRouteValue(showId) },
        { label: "Subpath", value: formatRouteValue(rest) },
      ]}
      links={[
        { href: `/shows/${showId}`, label: "Show overview" },
        { href: `/${showId}/social`, label: "Show social" },
      ]}
    />
  );
}
