import type { Metadata } from "next";

import {
  absolutePublicCanonicalUrl,
  parsePublicSeasonNumber,
  redirectToCanonicalPublicPath,
  requestedPublicRoutePath,
  resolvePublicIdentityForRoute,
} from "@/app/_lib/public-identity-route";
import PublicRouteShell from "@/components/public/PublicRouteShell";
import { resolvePublicSeasonIdentity } from "@/lib/server/trr-api/public-identities";

type ShowSeasonPageProps = {
  params: Promise<{ showId: string; seasonNumber: string }>;
};

async function resolveSeason({ params }: ShowSeasonPageProps) {
  const { showId, seasonNumber: rawSeasonNumber } = await params;
  const seasonNumber = parsePublicSeasonNumber(rawSeasonNumber);
  const identity = await resolvePublicIdentityForRoute(() =>
    resolvePublicSeasonIdentity(showId, seasonNumber),
  );
  return { identity, rawSeasonNumber, showId };
}

export async function generateMetadata(props: ShowSeasonPageProps): Promise<Metadata> {
  const { identity } = await resolveSeason(props);
  return {
    title: `${identity.show_name} Season ${identity.season_number} | The Reality Report`,
    alternates: {
      canonical: absolutePublicCanonicalUrl(identity.canonical_path),
    },
  };
}

export default async function ShowSeasonPage({ params }: ShowSeasonPageProps) {
  const { identity, rawSeasonNumber, showId } = await resolveSeason({ params });
  redirectToCanonicalPublicPath(
    requestedPublicRoutePath(["shows", showId, "seasons", rawSeasonNumber]),
    identity.canonical_path,
  );

  const seasonLabel = identity.season_title
    ? `Season ${identity.season_number}: ${identity.season_title}`
    : `Season ${identity.season_number}`;

  return (
    <PublicRouteShell
      eyebrow="Season"
      title={`${identity.show_name} Season ${identity.season_number}`}
      description={`Explore ${seasonLabel} of ${identity.show_name} on The Reality Report.`}
      details={[
        { label: "Show", value: identity.show_name },
        { label: "Season", value: seasonLabel },
      ]}
      links={[
        { href: `/shows/${identity.canonical_show_slug}`, label: "Show page" },
        { href: `${identity.canonical_path}/social/week/1`, label: "Season social" },
      ]}
    />
  );
}
