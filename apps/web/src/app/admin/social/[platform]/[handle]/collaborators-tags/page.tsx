import { notFound, redirect } from "next/navigation";
import { resolveSocialAccountProfileRoute } from "@/lib/admin/social-account-profile-route";

type PageProps = {
  params: Promise<{ platform: string; handle: string }>;
};

export default async function LegacyAdminSocialAccountProfileCollaboratorsTagsPage({ params }: PageProps) {
  const resolved = resolveSocialAccountProfileRoute(await params, { tab: "collaborators-tags" });
  if (!resolved) {
    notFound();
  }
  redirect(resolved.canonicalUrl);
}
