import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ platform: string; handle: string }>;
};

export default async function LegacyAdminSocialAccountProfileHashtagsPage({ params }: PageProps) {
  const resolved = await params;
  redirect(
    `/social/${encodeURIComponent(resolved.platform)}/${encodeURIComponent(resolved.handle)}/hashtags`,
  );
}
