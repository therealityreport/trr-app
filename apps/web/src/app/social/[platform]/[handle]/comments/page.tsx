import { notFound, redirect } from "next/navigation";
import SocialAccountProfilePage from "@/components/admin/SocialAccountProfilePage";
import {
  SOCIAL_ACCOUNT_COMMENTS_ENABLED_PLATFORMS,
  type SocialPlatformSlug,
} from "@/lib/admin/social-account-profile";
import { resolveSocialAccountProfileRoute } from "@/lib/admin/social-account-profile-route";

type PageProps = {
  params: Promise<{ platform: string; handle: string }>;
};

/**
 * Canonical comments page (P0-1b). New admin pages live under `/social/...` —
 * the `/admin/social/...` tree is legacy and its `comments` sibling redirects
 * here. See `feedback_app_url_conventions.md` in memory and the Locked Decisions
 * section of `instagram-comments-scrapling-fixes.md`.
 */
export default async function SocialAccountProfileCommentsPage({ params }: PageProps) {
  const resolved = resolveSocialAccountProfileRoute(await params, {
    tab: "comments",
    supportedPlatforms: SOCIAL_ACCOUNT_COMMENTS_ENABLED_PLATFORMS,
  });
  if (!resolved) {
    notFound();
  }
  if (resolved.requiresRedirect) {
    redirect(resolved.canonicalUrl);
  }
  return <SocialAccountProfilePage platform={resolved.platform as SocialPlatformSlug} handle={resolved.handle} activeTab="comments" />;
}
