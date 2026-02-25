import { notFound, redirect } from "next/navigation";
import type { Route } from "next";
import ShowAdminPage from "../page";

interface ShowSectionPageProps {
  params: Promise<{ showId: string; showSection: string }>;
}

const KNOWN_SHOW_SECTIONS = new Set([
  "overview",
  "seasons",
  "cast",
  "social",
  "surveys",
  "details",
  "settings",
  "news",
  "assets",
  "media-gallery",
  "media-videos",
  "media-brand",
]);

export default async function ShowSectionRedirectPage({ params }: ShowSectionPageProps) {
  const { showId, showSection } = await params;
  const normalizedSection = showSection.trim().toLowerCase();

  // Handle season slug redirects (e.g. /admin/trr-shows/{id}/season-1)
  const seasonMatch = normalizedSection.match(/^season-([0-9]{1,3})$/);
  if (seasonMatch) {
    const seasonNumber = Number.parseInt(seasonMatch[1], 10);
    if (Number.isFinite(seasonNumber)) {
      redirect(`/shows/${showId}/s${seasonNumber}` as Route);
    }
  }

  // Render known section aliases directly through the canonical show admin page.
  // The client route parser reads the current path and selects the correct tab
  // without query-string rewrites, which prevents URL bounce loops.
  if (KNOWN_SHOW_SECTIONS.has(normalizedSection)) {
    return <ShowAdminPage />;
  }

  notFound();
}
