import { redirect } from "next/navigation";

type AdminRedditSeasonAliasPageProps = {
  params: Promise<{ communitySlug: string; showSlug: string; seasonNumber: string }>;
};

export default async function AdminRedditSeasonAliasPage({ params }: AdminRedditSeasonAliasPageProps) {
  const { communitySlug, showSlug, seasonNumber } = await params;
  redirect(
    `/${encodeURIComponent(showSlug)}/social/reddit/${encodeURIComponent(communitySlug)}/${encodeURIComponent(
      seasonNumber,
    )}`,
  );
}
