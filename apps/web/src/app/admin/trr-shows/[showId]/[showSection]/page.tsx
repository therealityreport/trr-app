import { notFound, redirect } from "next/navigation";

interface ShowSectionPageProps {
  params: Promise<{ showId: string; showSection: string }>;
}

const SECTION_TO_QUERY: Record<string, { tab: string; assets?: "images" | "videos" | "brand" }> =
  {
    seasons: { tab: "seasons" },
    cast: { tab: "cast" },
    social: { tab: "social" },
    surveys: { tab: "surveys" },
    details: { tab: "details" },
    news: { tab: "news" },
    assets: { tab: "assets", assets: "images" },
    "media-gallery": { tab: "assets", assets: "images" },
    "media-videos": { tab: "assets", assets: "videos" },
    "media-brand": { tab: "assets", assets: "brand" },
  };

export default async function ShowSectionRedirectPage({ params }: ShowSectionPageProps) {
  const { showId, showSection } = await params;
  const normalizedSection = showSection.trim().toLowerCase();

  // Handle season slug redirects (e.g. /admin/trr-shows/{id}/season-1)
  const seasonMatch = normalizedSection.match(/^season-([0-9]{1,3})$/);
  if (seasonMatch) {
    const seasonNumber = Number.parseInt(seasonMatch[1], 10);
    if (Number.isFinite(seasonNumber)) {
      redirect(`/admin/trr-shows/${showId}/seasons/${seasonNumber}`);
    }
  }

  // Handle section redirects (e.g. /admin/trr-shows/{id}/cast)
  const mapping = SECTION_TO_QUERY[normalizedSection];
  if (!mapping) {
    notFound();
  }

  const next = new URLSearchParams();
  next.set("tab", mapping.tab);
  if (mapping.assets) next.set("assets", mapping.assets);
  redirect(`/admin/trr-shows/${showId}?${next.toString()}`);
}

