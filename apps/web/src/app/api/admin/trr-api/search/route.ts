import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { buildPersonRouteSlug } from "@/lib/admin/show-admin-routes";
import {
  searchEpisodes,
  searchPeopleWithShowContext,
  searchShows,
} from "@/lib/server/trr-api/trr-shows-repository";

export const dynamic = "force-dynamic";

const MIN_QUERY_LENGTH = 3;
const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 20;

const parseLimit = (raw: string | null): number => {
  const parsed = Number.parseInt(raw ?? String(DEFAULT_LIMIT), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(Math.max(parsed, 1), MAX_LIMIT);
};

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (query.length < MIN_QUERY_LENGTH) {
      return NextResponse.json(
        { error: `Query must be at least ${MIN_QUERY_LENGTH} characters` },
        { status: 400 },
      );
    }

    const limit = parseLimit(request.nextUrl.searchParams.get("limit"));

    const [shows, people, episodes] = await Promise.all([
      searchShows(query, { limit, offset: 0 }),
      searchPeopleWithShowContext(query, { limit, offset: 0 }),
      searchEpisodes(query, { limit, offset: 0 }),
    ]);

    return NextResponse.json({
      query,
      pagination: {
        per_type_limit: limit,
      },
      shows: shows.map((show) => ({
        id: show.id,
        name: show.name,
        slug: show.canonical_slug || show.slug,
      })),
      people: people.map((person) => ({
        id: person.id,
        full_name: person.full_name,
        known_for: person.known_for,
        show_context: person.show_context,
        person_slug: buildPersonRouteSlug({
          personName: person.full_name,
          personId: person.id,
        }),
      })),
      episodes: episodes.map((episode) => ({
        id: episode.id,
        title: episode.title,
        episode_number: episode.episode_number,
        season_number: episode.season_number,
        air_date: episode.air_date,
        show_id: episode.show_id,
        show_name: episode.show_name,
        show_slug: episode.show_slug,
      })),
    });
  } catch (error) {
    console.error("[api] Failed to run admin global search", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
