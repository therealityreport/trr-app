import { notFound, redirect } from "next/navigation";
import SocialAccountProfilePage from "@/components/admin/SocialAccountProfilePage";
import {
  SOCIAL_ACCOUNT_PROFILE_PLATFORMS,
  type SocialPlatformSlug,
} from "@/lib/admin/social-account-profile";
import { normalizeSocialAccountProfileHandle } from "@/lib/admin/show-admin-routes";

type PageProps = {
  params: Promise<{ platform: string; handle: string }>;
};

const isValidHandle = (value: string): boolean => /^[a-z0-9._-]{1,64}$/i.test(value);

export default async function SocialAccountProfileCollaboratorsTagsPage({ params }: PageProps) {
  const resolved = await params;
  const platform = resolved.platform.trim().toLowerCase();
  const rawHandle = resolved.handle.trim().replace(/^@+/, "").toLowerCase();
  if (!SOCIAL_ACCOUNT_PROFILE_PLATFORMS.includes(platform as (typeof SOCIAL_ACCOUNT_PROFILE_PLATFORMS)[number])) {
    notFound();
  }
  if (!isValidHandle(rawHandle)) {
    notFound();
  }
  const handle = normalizeSocialAccountProfileHandle(rawHandle);
  if (!handle) {
    notFound();
  }
  if (rawHandle !== handle) {
    redirect(`/social/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}/collaborators-tags`);
  }
  return (
    <SocialAccountProfilePage
      platform={platform as SocialPlatformSlug}
      handle={handle}
      activeTab="collaborators-tags"
    />
  );
}
