import { notFound, redirect } from "next/navigation";
import SocialAccountProfilePage from "@/components/admin/SocialAccountProfilePage";
import {
  SOCIAL_ACCOUNT_CATALOG_ENABLED_PLATFORMS,
  type SocialPlatformSlug,
} from "@/lib/admin/social-account-profile";
import { resolveSocialAccountProfileRoute } from "@/lib/admin/social-account-profile-route";

type PageProps = {
  params: Promise<{ platform: string; handle: string }>;
};

export default async function SocialAccountProfileCatalogPage({ params }: PageProps) {
  const resolved = resolveSocialAccountProfileRoute(await params, {
    tab: "catalog",
    supportedPlatforms: SOCIAL_ACCOUNT_CATALOG_ENABLED_PLATFORMS,
  });
  if (!resolved) {
    notFound();
  }
  if (resolved.requiresRedirect) {
    redirect(resolved.canonicalUrl);
  }
  return <SocialAccountProfilePage platform={resolved.platform as SocialPlatformSlug} handle={resolved.handle} activeTab="catalog" />;
}
