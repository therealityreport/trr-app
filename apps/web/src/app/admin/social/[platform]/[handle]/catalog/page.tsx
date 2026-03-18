import SocialAccountProfilePage from "@/components/admin/SocialAccountProfilePage";
import {
  SOCIAL_ACCOUNT_PROFILE_PLATFORMS,
  type SocialPlatformSlug,
} from "@/lib/admin/social-account-profile";

type PageProps = {
  params: Promise<{ platform: string; handle: string }>;
};

export default async function SocialAccountCatalogPage({ params }: PageProps) {
  const { platform, handle } = await params;
  if (!SOCIAL_ACCOUNT_PROFILE_PLATFORMS.includes(platform as SocialPlatformSlug)) {
    return null;
  }
  return <SocialAccountProfilePage platform={platform as SocialPlatformSlug} handle={handle} activeTab="catalog" />;
}
