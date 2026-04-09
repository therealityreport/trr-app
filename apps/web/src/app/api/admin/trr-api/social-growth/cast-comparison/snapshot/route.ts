import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  buildAdminAuthPartition,
  buildAdminSnapshotCacheKey,
  getOrCreateAdminSnapshot,
} from "@/lib/server/admin/admin-snapshot-cache";
import { buildSnapshotResponse, buildSnapshotSubrequest } from "@/lib/server/admin/admin-snapshot-route";

import { GET as getPersonSocialGrowth } from "@/app/api/admin/trr-api/people/[personId]/social-growth/route";

type SnapshotItem = {
  personId: string;
  handle: string;
  data: Record<string, unknown> | null;
  error: string | null;
  not_found: boolean;
};

const SNAPSHOT_TTL_MS = 2_500;
const SNAPSHOT_STALE_MS = 2_500;

export const dynamic = "force-dynamic";

const parseSnapshotItems = (searchParams: URLSearchParams): Array<{ personId: string; handle: string }> => {
  const items: Array<{ personId: string; handle: string }> = [];
  for (const rawItem of searchParams.getAll("item")) {
    const [personId, ...handleParts] = rawItem.split(":");
    const handle = handleParts.join(":");
    if (!personId?.trim() || !handle.trim()) continue;
    items.push({ personId: personId.trim(), handle: handle.trim() });
  }
  return items;
};

export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const searchParams = new URLSearchParams(request.nextUrl.searchParams);
    const forceRefresh = (searchParams.get("refresh") ?? "").trim().length > 0;
    searchParams.delete("refresh");
    const items = parseSnapshotItems(searchParams);
    if (items.length === 0) {
      return NextResponse.json({ error: "item query params are required" }, { status: 400 });
    }

    const snapshot = await getOrCreateAdminSnapshot({
      cacheKey: buildAdminSnapshotCacheKey({
        authPartition: buildAdminAuthPartition(user),
        pageFamily: "cast-socialblade",
        scope: "cast-comparison",
        query: searchParams,
      }),
      ttlMs: SNAPSHOT_TTL_MS,
      staleIfErrorTtlMs: SNAPSHOT_STALE_MS,
      forceRefresh,
      fetcher: async () => {
        const results = await Promise.all(
          items.map(async (item): Promise<SnapshotItem> => {
            const response = await getPersonSocialGrowth(
              buildSnapshotSubrequest(
                request,
                `/api/admin/trr-api/people/${encodeURIComponent(item.personId)}/social-growth`,
                new URLSearchParams({ handle: item.handle }),
              ),
              { params: Promise.resolve({ personId: item.personId }) },
            );
            const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
            if (response.ok) {
              return {
                personId: item.personId,
                handle: item.handle,
                data: payload,
                error: null,
                not_found: false,
              };
            }
            return {
              personId: item.personId,
              handle: item.handle,
              data: null,
              error: typeof payload.error === "string" ? payload.error : `HTTP ${response.status}`,
              not_found: response.status === 404,
            };
          }),
        );
        return { items: results };
      },
    });

    return buildSnapshotResponse({
      data: snapshot.data,
      cacheStatus: snapshot.meta.cacheStatus,
      generatedAt: snapshot.meta.generatedAt,
      cacheAgeMs: snapshot.meta.cacheAgeMs,
      stale: snapshot.meta.stale,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch cast SocialBlade snapshot";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
