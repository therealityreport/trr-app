import { redirect } from "next/navigation";

type AdminRedditSeasonWindowAliasPageProps = {
  params: Promise<{ communitySlug: string; showSlug: string; seasonNumber: string; windowKey: string }>;
};

export default async function AdminRedditSeasonWindowAliasPage({
  params,
}: AdminRedditSeasonWindowAliasPageProps) {
  const { communitySlug, showSlug, seasonNumber, windowKey } = await params;
  redirect(
    `/${encodeURIComponent(showSlug)}/social/reddit/${encodeURIComponent(communitySlug)}/${encodeURIComponent(
      seasonNumber,
    )}/${encodeURIComponent(windowKey)}`,
  );
}
