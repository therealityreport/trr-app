import { redirect } from "next/navigation";

type AdminRedditSeasonDetailAliasPageProps = {
  params: Promise<{
    communitySlug: string;
    showSlug: string;
    seasonNumber: string;
    windowKey: string;
    detailSlug: string;
  }>;
};

export default async function AdminRedditSeasonDetailAliasPage({
  params,
}: AdminRedditSeasonDetailAliasPageProps) {
  const { communitySlug, showSlug, seasonNumber, windowKey, detailSlug } = await params;
  redirect(
    `/${encodeURIComponent(showSlug)}/social/reddit/${encodeURIComponent(communitySlug)}/${encodeURIComponent(
      seasonNumber,
    )}/${encodeURIComponent(windowKey)}/${encodeURIComponent(detailSlug)}`,
  );
}
