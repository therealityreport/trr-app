import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { buildPersonRouteSlug } from "@/lib/admin/show-admin-routes";
import {
  getPeopleMostPopular,
  getPeopleMostShows,
  getPeopleRecentlyAdded,
  getPeopleTopEpisodes,
  type PersonLeaderboardEntry,
} from "@/lib/server/trr-api/trr-shows-repository";
import { getRecentPeopleViews } from "@/lib/server/admin/recent-people-repository";

export const dynamic = "force-dynamic";

const DEFAULT_SECTION_LIMIT = 12;
const MAX_SECTION_LIMIT = 24;

type PeopleHomeItem = {
  person_id: string;
  person_slug: string;
  full_name: string;
  known_for: string | null;
  photo_url: string | null;
  show_context: string | null;
  metric_label: string;
  metric_value: number;
  latest_at: string | null;
};

type SectionResponse = {
  items: PeopleHomeItem[];
  error: string | null;
};

const parseLimit = (raw: string | null): number => {
  const parsed = Number.parseInt(raw ?? String(DEFAULT_SECTION_LIMIT), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_SECTION_LIMIT;
  return Math.min(Math.max(parsed, 1), MAX_SECTION_LIMIT);
};

const mapLeaderboardItem = (
  item: Pick<
    PersonLeaderboardEntry,
    "person_id" | "full_name" | "known_for" | "photo_url" | "show_context" | "metric_value" | "latest_at"
  >,
  metricLabel: string,
): PeopleHomeItem => {
  const fullName = item.full_name?.trim() || "Unknown Person";
  return {
    person_id: item.person_id,
    person_slug: buildPersonRouteSlug({
      personName: fullName,
      personId: item.person_id,
    }),
    full_name: fullName,
    known_for: item.known_for,
    photo_url: item.photo_url,
    show_context: item.show_context,
    metric_label: metricLabel,
    metric_value: item.metric_value,
    latest_at: item.latest_at,
  };
};

const buildSection = async (
  loader: () => Promise<PeopleHomeItem[]>,
): Promise<SectionResponse> => {
  try {
    return { items: await loader(), error: null };
  } catch (error) {
    console.error("[api] Failed to load people-home section", error);
    return {
      items: [],
      error: error instanceof Error ? error.message : "Failed to load section",
    };
  }
};

export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const limit = parseLimit(request.nextUrl.searchParams.get("limit"));

    const [recentlyViewed, mostPopular, mostShows, topEpisodes, recentlyAdded] = await Promise.all([
      buildSection(async () => {
        const rows = await getRecentPeopleViews(user.uid, { limit });
        return rows.map((row) => ({
          person_id: row.person_id,
          person_slug: buildPersonRouteSlug({
            personName: row.full_name ?? "Unknown Person",
            personId: row.person_id,
          }),
          full_name: row.full_name?.trim() || "Unknown Person",
          known_for: row.known_for,
          photo_url: row.photo_url,
          show_context: row.show_context,
          metric_label: "Views",
          metric_value: row.view_count,
          latest_at: row.last_viewed_at,
        }));
      }),
      buildSection(async () => {
        const rows = await getPeopleMostPopular({ limit });
        return rows.map((row) => mapLeaderboardItem(row, "News Score"));
      }),
      buildSection(async () => {
        const rows = await getPeopleMostShows({ limit });
        return rows.map((row) => mapLeaderboardItem(row, "Shows"));
      }),
      buildSection(async () => {
        const rows = await getPeopleTopEpisodes({ limit });
        return rows.map((row) => mapLeaderboardItem(row, "Episodes"));
      }),
      buildSection(async () => {
        const rows = await getPeopleRecentlyAdded({ limit });
        return rows.map((row) => mapLeaderboardItem(row, "Recently Added"));
      }),
    ]);

    return NextResponse.json({
      sections: {
        recentlyViewed,
        mostPopular,
        mostShows,
        topEpisodes,
        recentlyAdded,
      },
      pagination: {
        limit,
      },
    });
  } catch (error) {
    console.error("[api] Failed to build people home payload", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
