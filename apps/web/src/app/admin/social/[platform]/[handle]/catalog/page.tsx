import { notFound, redirect } from "next/navigation";
import {
  SOCIAL_ACCOUNT_CATALOG_ENABLED_PLATFORMS,
} from "@/lib/admin/social-account-profile";
import { resolveSocialAccountProfileRoute } from "@/lib/admin/social-account-profile-route";

type PageProps = {
  params: Promise<{ platform: string; handle: string }>;
};

export default async function LegacyAdminSocialAccountCatalogPage({ params }: PageProps) {
  const resolved = resolveSocialAccountProfileRoute(await params, {
    tab: "catalog",
    supportedPlatforms: SOCIAL_ACCOUNT_CATALOG_ENABLED_PLATFORMS,
  });
  if (!resolved) {
    notFound();
  }
  redirect(resolved.canonicalUrl);
}
