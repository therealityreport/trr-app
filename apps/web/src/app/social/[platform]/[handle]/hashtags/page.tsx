import { notFound, redirect } from "next/navigation";
import SocialAccountProfilePage from "@/components/admin/SocialAccountProfilePage";
import { type SocialPlatformSlug } from "@/lib/admin/social-account-profile";
import { resolveSocialAccountProfileRoute } from "@/lib/admin/social-account-profile-route";

type PageProps = {
  params: Promise<{ platform: string; handle: string }>;
};

export default async function SocialAccountProfileHashtagsPage({ params }: PageProps) {
  const resolved = resolveSocialAccountProfileRoute(await params, { tab: "hashtags" });
  if (!resolved) {
    notFound();
  }
  if (resolved.requiresRedirect) {
    redirect(resolved.canonicalUrl);
  }
  return <SocialAccountProfilePage platform={resolved.platform as SocialPlatformSlug} handle={resolved.handle} activeTab="hashtags" />;
}
