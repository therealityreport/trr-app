import { notFound, redirect } from "next/navigation";
import { SOCIAL_ACCOUNT_COMMENTS_ENABLED_PLATFORMS } from "@/lib/admin/social-account-profile";
import { resolveSocialAccountProfileRoute } from "@/lib/admin/social-account-profile-route";

type PageProps = {
  params: Promise<{ platform: string; handle: string }>;
};

/**
 * Legacy comments page (P0-1b). The canonical route is `/social/.../comments`.
 * This redirect exists so inbound links from the `/admin/social/` tree keep
 * working until the broader admin URL migration happens.
 */
export default async function LegacyAdminSocialAccountProfileCommentsPage({ params }: PageProps) {
  const resolved = resolveSocialAccountProfileRoute(await params, {
    tab: "comments",
    supportedPlatforms: SOCIAL_ACCOUNT_COMMENTS_ENABLED_PLATFORMS,
  });
  if (!resolved) {
    notFound();
  }
  redirect(resolved.canonicalUrl);
}
