import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { fetchSocialBackendJson, socialProxyErrorResponse } from "@/lib/server/trr-api/social-admin-proxy";
import { isValidUuid } from "@/lib/server/validation/identifiers";
type Resource = "coverage" | "settings" | "legacy-inventory" | "lifecycle" | "analysis" | "reclassify" | "targets" | "control" | "compare" | "job";
const fields: Record<string, string[]> = {
  control: ["action"], lifecycle: ["season_id", "legacy", "post_ids"],
  analysis: ["season_id", "kind", "post_ids"], reclassify: ["season_id", "apply", "preview_id"],
  settings: ["schedule", "analysis"],
};
export async function operatorProxy(request: NextRequest, params: Promise<Record<string, string>>, resource: Resource) {
  try {
    await requireAdmin(request);
    const values = await params;
    const id = values.communityId ?? values.runId ?? values.jobId;
    if (!id || !isValidUuid(id))
      return NextResponse.json({ error: "A valid identifier is required" }, { status: 400 });
    const query = new URLSearchParams();
    for (const key of ["season_id", "baseline_id", "limit", "offset"]) {
      const value = request.nextUrl.searchParams.get(key);
      if (value !== null) {
        if (["season_id", "baseline_id"].includes(key) && !isValidUuid(value))
          return NextResponse.json({ error: `${key} must be a valid UUID` }, { status: 400 });
        if (["limit", "offset"].includes(key) && (!/^\d+$/.test(value) || (key === "limit" && (Number(value) < 1 || Number(value) > 200))))
          return NextResponse.json({ error: `Invalid ${key}` }, { status: 400 });
        query.set(key, value);
      }
    }
    let body: Record<string, unknown> | undefined;
    if (request.method !== "GET") {
      const input = await request.json().catch(() => null);
      if (!input || Array.isArray(input) || typeof input !== "object")
        return NextResponse.json({ error: "A JSON object is required" }, { status: 400 });
      body = Object.fromEntries((fields[resource] ?? []).filter(key => key in input).map(key => [key, input[key]]));
      if (body.season_id !== undefined && (typeof body.season_id !== "string" || !isValidUuid(body.season_id)))
        return NextResponse.json({ error: "season_id must be a valid UUID" }, { status: 400 });
      if (resource === "control" && !["pause", "resume", "cancel", "retry"].includes(String(body.action)))
        return NextResponse.json({ error: "Invalid run action" }, { status: 400 });
      if (resource === "analysis" && !["deterministic", "ai"].includes(String(body.kind)))
        return NextResponse.json({ error: "Invalid analysis kind" }, { status: 400 });
      if (resource === "reclassify" && typeof body.apply !== "boolean")
        return NextResponse.json({ error: "apply must be a boolean" }, { status: 400 });
      if (resource === "lifecycle" && typeof body.legacy !== "boolean")
        return NextResponse.json({ error: "legacy must be a boolean" }, { status: 400 });
    }
    const path = resource === "job" ? `/reddit/jobs/${id}` : values.communityId ? `/reddit/communities/${id}/${resource}` : `/reddit/runs/${id}/${resource}`;
    const data = await fetchSocialBackendJson(path, {
      method: request.method as "GET" | "POST" | "PATCH", queryString: query.toString(),
      ...(body ? { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } } : {}),
      fallbackError: "Reddit operator request failed", timeoutMs: 20000, retries: request.method === "GET" ? 1 : 0,
    });
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  }
  catch (error) {
    return socialProxyErrorResponse(error, "[api] Reddit operator request failed");
  }
}
