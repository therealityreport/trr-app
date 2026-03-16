import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ platform: string; handle: string }>;
};

export default async function LegacySocialAccountProfilePostsPage({ params }: PageProps) {
  const resolved = await params;
  redirect(
    `/admin/social/${encodeURIComponent(resolved.platform)}/${encodeURIComponent(resolved.handle)}/posts`,
  );
}
