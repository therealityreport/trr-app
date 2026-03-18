import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

const NBCUMV_CLOUDSEARCH_URL =
  "https://jrh818qk4k.execute-api.us-west-2.amazonaws.com/v1/";
const NBCUMV_APPSYNC_URL =
  "https://bfg5dqxssngazhtsf6uo7bzdvm.appsync-api.us-west-2.amazonaws.com/graphql";
const NBCUMV_APPSYNC_KEY = "da2-rmy4cbtcevfwrdadqabta7ezl4";

interface CloudSearchHit {
  id: string;
  fields: {
    item_number?: string[];
    description?: string[];
    shows?: string[];
    headline?: string[];
    meta_types?: string[];
  };
}

interface AppSyncImage {
  id: string;
  lbx_id: number | null;
  lbx_filename: string | null;
  lbx_caption: string | null;
  location: string | null;
  liveDate: string | null;
  lbx_seasonNumber: string | null;
}

interface TalentBio {
  itemNumber: string;
  description: string;
  headline: string;
  shows: string[];
  season: number | null;
  showName: string | null;
  thumbnailUrl: string | null;
  filename: string | null;
}

function parseSeasonFromDescription(desc: string): {
  season: number | null;
  showName: string | null;
} {
  // Pattern: "SHOW NAME -- Season:N -- Pictured: ..."
  const seasonMatch = desc.match(/Season[:\s]*(\d+)/i);
  const season = seasonMatch ? parseInt(seasonMatch[1], 10) : null;

  // Extract show name: everything before " -- Season" or " -- Pictured"
  const showMatch = desc.match(/^(.+?)\s*--\s*(?:Season|Pictured)/i);
  const showName = showMatch ? showMatch[1].trim() : null;

  return { season, showName };
}

async function searchTalentBios(personName: string): Promise<CloudSearchHit[]> {
  const params = new URLSearchParams({
    q: personName,
    "q.options": JSON.stringify({ fields: ["description"] }),
    fq: 'meta_types:"talent"',
    return: "item_number,description,shows,headline,meta_types",
    size: "50",
  });

  const response = await fetch(`${NBCUMV_CLOUDSEARCH_URL}?${params}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`CloudSearch returned ${response.status}`);
  }

  const data = (await response.json()) as {
    hits?: { hit?: CloudSearchHit[] };
  };

  return data.hits?.hit ?? [];
}

async function fetchThumbnailsByLbxIds(
  lbxIds: number[]
): Promise<Map<number, AppSyncImage>> {
  if (lbxIds.length === 0) return new Map();

  // Build OR filter to look up multiple lbx_ids in one query
  const orClauses = lbxIds.map((id) => `{lbx_id: {eq: ${id}}}`);
  const filterStr =
    orClauses.length === 1
      ? `{lbx_id: {eq: ${lbxIds[0]}}}`
      : `{or: [${orClauses.join(", ")}]}`;

  const query = `query {
    searchImages(
      filter: ${filterStr}
      limit: ${lbxIds.length}
    ) {
      items {
        id
        lbx_id
        lbx_filename
        lbx_caption
        location
        liveDate
        lbx_seasonNumber
      }
    }
  }`;

  const response = await fetch(NBCUMV_APPSYNC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": NBCUMV_APPSYNC_KEY,
    },
    body: JSON.stringify({ query }),
    cache: "no-store",
  });

  if (!response.ok) {
    console.warn("[nbcumv] AppSync thumbnail lookup failed:", response.status);
    return new Map();
  }

  const result = (await response.json()) as {
    data?: { searchImages?: { items?: AppSyncImage[] } };
  };

  const items = result.data?.searchImages?.items ?? [];
  const map = new Map<number, AppSyncImage>();
  for (const item of items) {
    if (item.lbx_id != null) {
      map.set(item.lbx_id, item);
    }
  }
  return map;
}

/**
 * GET /api/admin/nbcumv/talent-bios?personName=Lisa+Barlow
 *
 * Search NBCUMV for talent/bio records matching a person name.
 * Returns per-season bio entries with thumbnail URLs where available.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const personName = request.nextUrl.searchParams.get("personName")?.trim();
    if (!personName) {
      return NextResponse.json(
        { error: "personName query parameter is required" },
        { status: 400 }
      );
    }

    // Step 1: CloudSearch for talent records
    const hits = await searchTalentBios(personName);

    // Step 2: Extract item_numbers and parse metadata
    const lbxIds: number[] = [];
    const parsedHits = hits.map((hit) => {
      const itemNumber = hit.fields.item_number?.[0] ?? "";
      const description = hit.fields.description?.[0] ?? "";
      const headline = hit.fields.headline?.[0] ?? "";
      const shows = hit.fields.shows ?? [];
      const { season, showName } = parseSeasonFromDescription(description);

      const numericId = parseInt(itemNumber, 10);
      if (!isNaN(numericId)) {
        lbxIds.push(numericId);
      }

      return { itemNumber, description, headline, shows, season, showName };
    });

    // Step 3: Batch-fetch thumbnail URLs from AppSync
    const thumbnailMap = await fetchThumbnailsByLbxIds(lbxIds);

    // Step 4: Combine results
    const bios: TalentBio[] = parsedHits.map((hit) => {
      const numericId = parseInt(hit.itemNumber, 10);
      const appSyncImage = !isNaN(numericId)
        ? thumbnailMap.get(numericId)
        : undefined;

      return {
        ...hit,
        thumbnailUrl: appSyncImage?.location ?? null,
        filename: appSyncImage?.lbx_filename ?? null,
      };
    });

    // Sort by season descending (most recent first)
    bios.sort((a, b) => (b.season ?? 0) - (a.season ?? 0));

    return NextResponse.json({ bios, count: bios.length });
  } catch (error) {
    console.error("[api] NBCUMV talent bios lookup failed:", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
