import { redirect } from "next/navigation";

type AdminRedditSeasonPostAliasPageProps = {
  params: Promise<{
    communitySlug: string;
    showSlug: string;
    seasonNumber: string;
    windowKey: string;
    postId: string;
  }>;
};

export default async function AdminRedditSeasonPostAliasPage({ params }: AdminRedditSeasonPostAliasPageProps) {
  const { communitySlug, showSlug, seasonNumber, windowKey, postId } = await params;
  redirect(
    `/${encodeURIComponent(showSlug)}/social/reddit/${encodeURIComponent(communitySlug)}/${encodeURIComponent(
      seasonNumber,
    )}/${encodeURIComponent(windowKey)}/${encodeURIComponent(postId)}`,
  );
}
