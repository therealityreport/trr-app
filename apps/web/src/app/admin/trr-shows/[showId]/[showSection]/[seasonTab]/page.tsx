import { notFound, redirect } from "next/navigation";

interface SeasonTabAliasPageProps {
  params: Promise<{ showId: string; showSection: string; seasonTab: string }>;
}

const ALLOWED_SEASON_TABS = new Set([
  "episodes",
  "assets",
  "videos",
  "cast",
  "surveys",
  "social",
  "details",
]);

export default async function SeasonTabAliasPage({ params }: SeasonTabAliasPageProps) {
  const { showId, showSection, seasonTab } = await params;
  const normalizedSlug = showSection.trim().toLowerCase();
  const normalizedTab = seasonTab.trim().toLowerCase();

  const seasonMatch = normalizedSlug.match(/^season-([0-9]{1,3})$/);
  if (!seasonMatch) {
    notFound();
  }
  if (!ALLOWED_SEASON_TABS.has(normalizedTab)) {
    notFound();
  }

  const seasonNumber = Number.parseInt(seasonMatch[1], 10);
  if (!Number.isFinite(seasonNumber)) {
    notFound();
  }

  redirect(`/admin/trr-shows/${showId}/seasons/${seasonNumber}?tab=${normalizedTab}`);
}
