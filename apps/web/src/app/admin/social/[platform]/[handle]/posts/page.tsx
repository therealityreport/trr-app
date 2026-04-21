import { notFound, redirect } from "next/navigation";
import { resolveSocialAccountProfileRoute } from "@/lib/admin/social-account-profile-route";

type PageProps = {
  params: Promise<{ platform: string; handle: string }>;
};

export default async function LegacyAdminSocialAccountProfilePostsPage({ params }: PageProps) {
  const resolved = resolveSocialAccountProfileRoute(await params, { tab: "posts" });
  if (!resolved) {
    notFound();
  }
  redirect(resolved.canonicalUrl);
}
