import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ platform: string; handle: string }>;
};

/**
 * Legacy comments page (P0-1b). The canonical route is `/social/.../comments`.
 * This redirect exists so inbound links from the `/admin/social/` tree keep
 * working until the broader admin URL migration happens.
 */
export default async function LegacyAdminSocialAccountProfileCommentsPage({ params }: PageProps) {
  const resolved = await params;
  redirect(
    `/social/${encodeURIComponent(resolved.platform)}/${encodeURIComponent(resolved.handle)}/comments`,
  );
}
