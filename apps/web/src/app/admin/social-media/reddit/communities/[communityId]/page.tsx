import type { Route } from "next";
import { redirect } from "next/navigation";
import {
  resolveLegacyAdminRedditCanonicalHref,
  type LegacyRouteSearchParams,
} from "@/lib/server/admin/reddit-admin-legacy-routes";

type PageProps = {
  params: Promise<{ communityId: string }>;
  searchParams?: Promise<LegacyRouteSearchParams>;
};

export default async function LegacyAdminSocialRedditCommunityPage({ params, searchParams }: PageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  redirect(
    (await resolveLegacyAdminRedditCanonicalHref({
      communityId: resolvedParams.communityId,
      searchParams: resolvedSearchParams,
    })) as Route,
  );
}
