import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { query as pgQuery } from "@/lib/server/postgres";
import { getBackendApiUrl } from "@/lib/server/trr-api/backend";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ seasonId: string }>;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fetchJsonWithTimeout = async (
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<{ response: Response; data: Record<string, unknown> }> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    return { response, data };
  } finally {
    clearTimeout(timer);
  }
};

async function mirrorToS3(mediaAssetId: string): Promise<{ ok: boolean; error?: string }> {
  const backendUrl = getBackendApiUrl(`/admin/media-assets/${mediaAssetId}/mirror`);
  if (!backendUrl) return { ok: false, error: "Backend API not configured" };

  const serviceRoleKey = process.env.TRR_CORE_SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) return { ok: false, error: "Backend auth not configured" };

  try {
    const { response, data } = await fetchJsonWithTimeout(
      backendUrl,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({}),
      },
      120_000
    );
    if (!response.ok) {
      const msg =
        typeof data.error === "string"
          ? data.error
          : typeof data.detail === "string"
            ? data.detail
            : `Mirror failed (HTTP ${response.status})`;
      return { ok: false, error: msg };
    }
    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { ok: false, error: "Mirror timed out (120s)" };
    }
    return { ok: false, error: error instanceof Error ? error.message : "Mirror failed" };
  }
}

async function runWithConcurrency<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  const queue = [...items];
  const limit = Math.max(1, Math.min(concurrency, queue.length));
  const runners = Array.from({ length: limit }, async () => {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) return;
      await worker(next);
    }
  });
  await Promise.all(runners);
}

/**
 * POST /api/admin/trr-api/seasons/[seasonId]/assign-backdrops
 *
 * Body: { media_asset_ids: string[] }
 *
 * Creates kind=backdrop media_links from the season to each media_asset_id.
 * Idempotent: skips links that already exist.
 *
 * For TMDb assets that are not mirrored yet (hosted_url is null), this will first
 * mirror them to S3 via TRR-Backend, then assign.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { seasonId } = await params;

    if (!seasonId) {
      return NextResponse.json({ error: "seasonId is required" }, { status: 400 });
    }
    if (!UUID_RE.test(seasonId)) {
      return NextResponse.json({ error: "seasonId must be a UUID" }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      media_asset_ids?: unknown;
    };
    const mediaAssetIds = Array.isArray(body.media_asset_ids)
      ? (body.media_asset_ids.filter((id) => typeof id === "string") as string[])
      : [];

    const mediaAssetIdsFiltered = mediaAssetIds.filter((id) => UUID_RE.test(id));
    if (mediaAssetIdsFiltered.length === 0) {
      return NextResponse.json(
        { error: "media_asset_ids must be a non-empty string array" },
        { status: 400 }
      );
    }

    const seasonResult = await pgQuery<{
      id: string;
      show_id: string;
      season_number: number;
    }>(
      `SELECT id, show_id, season_number
       FROM core.seasons
       WHERE id = $1::uuid
       LIMIT 1`,
      [seasonId]
    );
    const season = seasonResult.rows[0] ?? null;
    if (!season) {
      return NextResponse.json({ error: "Season not found" }, { status: 404 });
    }

    const existing = await pgQuery<{ media_asset_id: string }>(
      `SELECT media_asset_id
       FROM core.media_links
       WHERE entity_type = 'season'
         AND entity_id = $1::uuid
         AND kind = 'backdrop'
         AND media_asset_id = ANY($2::uuid[])`,
      [seasonId, mediaAssetIdsFiltered]
    );

    const already = new Set(existing.rows.map((row) => row.media_asset_id));
    const requested = mediaAssetIdsFiltered;
    const candidates = requested.filter((id) => !already.has(id));
    if (candidates.length === 0) {
      return NextResponse.json({
        requested: requested.length,
        assigned: 0,
        skipped: requested.length,
        mirrored_attempted: 0,
        mirrored_failed: 0,
        mirrored_failed_ids: [],
      });
    }

    // Mirror any not-yet-mirrored assets first (best-effort, but only assign ones that end up mirrored).
    const assetRows = await pgQuery<{
      id: string;
      hosted_url: string | null;
      source: string | null;
    }>(
      `SELECT id, hosted_url, source
       FROM core.media_assets
       WHERE id = ANY($1::uuid[])`,
      [candidates]
    );
    const assetsById = new Map(assetRows.rows.map((row) => [row.id, row]));
    const toMirror = candidates.filter((id) => {
      const row = assetsById.get(id) ?? null;
      // Mirror only when hosted_url is absent (already mirrored assets are assignable immediately).
      return Boolean(row && !row.hosted_url);
    });

    const mirrorFailures: Array<{ id: string; error: string }> = [];
    if (toMirror.length > 0) {
      await runWithConcurrency(toMirror, 3, async (id) => {
        const res = await mirrorToS3(id);
        if (!res.ok) mirrorFailures.push({ id, error: res.error ?? "Mirror failed" });
      });
    }

    // Re-check hosted_url and only assign those that are mirrored (or were already mirrored).
    const postMirror = await pgQuery<{ id: string; hosted_url: string | null }>(
      `SELECT id, hosted_url
       FROM core.media_assets
       WHERE id = ANY($1::uuid[])`,
      [candidates]
    );
    const hostedById = new Map(postMirror.rows.map((row) => [row.id, row.hosted_url ?? null]));
    const assignable = candidates.filter((id) => Boolean(hostedById.get(id)));
    const mirrorFailedIds = candidates.filter((id) => !hostedById.get(id));

    if (assignable.length === 0) {
      return NextResponse.json({
        requested: requested.length,
        assigned: 0,
        skipped: already.size,
        mirrored_attempted: toMirror.length,
        mirrored_failed: mirrorFailedIds.length,
        mirrored_failed_ids: mirrorFailedIds,
      });
    }

    // Insert season->backdrop links (idempotent, but we already filtered existing above).
    const values: unknown[] = [];
    const tuples: string[] = [];
    let idx = 1;
    const context = {
      show_id: season.show_id,
      season_number: season.season_number,
      assigned_from: "show_backdrops",
    };

    for (const media_asset_id of assignable) {
      tuples.push(
        `($${idx++}::text, $${idx++}::uuid, $${idx++}::uuid, $${idx++}::text, $${idx++}::int, $${idx++}::jsonb)`
      );
      values.push(
        "season",
        seasonId,
        media_asset_id,
        "backdrop",
        null,
        JSON.stringify(context)
      );
    }

    await pgQuery(
      `INSERT INTO core.media_links (entity_type, entity_id, media_asset_id, kind, position, context)
       VALUES ${tuples.join(", ")}`,
      values
    );

    return NextResponse.json({
      requested: requested.length,
      assigned: assignable.length,
      skipped: already.size,
      mirrored_attempted: toMirror.length,
      mirrored_failed: mirrorFailedIds.length,
      mirrored_failed_ids: mirrorFailedIds,
      mirror_failures: mirrorFailures,
    });
  } catch (error) {
    console.error("[api] Failed to assign backdrops", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
