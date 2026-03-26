import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  listPersonExternalIds,
  syncPersonExternalIds,
} from "@/lib/server/trr-api/trr-shows-repository";
import {
  isPersonExternalIdSource,
  type PersonExternalIdInput,
} from "@/lib/admin/person-external-ids";
import { invalidateRouteResponseCache } from "@/lib/server/admin/route-response-cache";
import { invalidateAdminBackendCache } from "@/lib/server/trr-api/admin-read-proxy";

export const dynamic = "force-dynamic";
const PERSON_DETAIL_CACHE_NAMESPACE = "admin-person-detail";

interface RouteParams {
  params: Promise<{ personId: string }>;
}

const readPersonId = async (params: RouteParams["params"]): Promise<string> => {
  const { personId } = await params;
  return personId;
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);

    const personId = await readPersonId(params);
    if (!personId) {
      return NextResponse.json({ error: "personId is required" }, { status: 400 });
    }

    const includeInactive =
      request.nextUrl.searchParams.get("includeInactive")?.trim().toLowerCase() === "true";
    const externalIds = await listPersonExternalIds(personId, { includeInactive });
    return NextResponse.json({ external_ids: externalIds });
  } catch (error) {
    console.error("[api] Failed to list person external IDs", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : message === "Person not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

const parseBodyRows = (body: unknown): PersonExternalIdInput[] | null => {
  if (!body || typeof body !== "object") return null;
  const rawRows = (body as { external_ids?: unknown }).external_ids;
  if (!Array.isArray(rawRows)) return null;

  const parsed: PersonExternalIdInput[] = [];
  for (const entry of rawRows) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const sourceId = typeof row.source_id === "string" ? row.source_id.trim().toLowerCase() : "";
    const externalId = typeof row.external_id === "string" ? row.external_id : "";
    if (!isPersonExternalIdSource(sourceId)) {
      throw new Error(`Unsupported source: ${sourceId || "unknown"}`);
    }
    parsed.push({
      source_id: sourceId,
      external_id: externalId,
      valid_from: typeof row.valid_from === "string" ? row.valid_from : null,
      valid_to: typeof row.valid_to === "string" ? row.valid_to : null,
      is_primary: true,
    });
  }
  return parsed;
};

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);

    const personId = await readPersonId(params);
    if (!personId) {
      return NextResponse.json({ error: "personId is required" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const externalIds = parseBodyRows(body);
    if (!externalIds) {
      return NextResponse.json(
        { error: "external_ids must be an array" },
        { status: 400 }
      );
    }

    const saved = await syncPersonExternalIds(personId, externalIds);
    invalidateRouteResponseCache(PERSON_DETAIL_CACHE_NAMESPACE, `${user.uid}:person:${personId}:`);
    await invalidateAdminBackendCache(`/admin/people/${personId}/cache/invalidate`, {
      routeName: "person-detail",
    });
    return NextResponse.json({ external_ids: saved });
  } catch (error) {
    console.error("[api] Failed to sync person external IDs", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message === "Person not found"
            ? 404
            : message.startsWith("Unsupported source:")
              ? 400
              : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
