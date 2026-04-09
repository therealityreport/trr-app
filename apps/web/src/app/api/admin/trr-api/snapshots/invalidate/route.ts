import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { invalidateAdminSnapshotFamilies } from "@/lib/server/admin/admin-snapshot-cache";

export const dynamic = "force-dynamic";

type SnapshotFamilyPayload =
  | { pageFamily: "season-social-analytics"; scope: string }
  | { pageFamily: "week-social"; scope: string }
  | { pageFamily: "social-profile"; scope: string }
  | { pageFamily: "reddit-sources"; scope: string }
  | { pageFamily: "cast-socialblade"; scope: string }
  | { pageFamily: "system-health"; scope?: string | null };

const isValidFamilyPayload = (value: unknown): value is SnapshotFamilyPayload => {
  if (!value || typeof value !== "object") return false;
  const payload = value as { pageFamily?: unknown; scope?: unknown };
  if (typeof payload.pageFamily !== "string") return false;
  if (
    payload.pageFamily !== "season-social-analytics" &&
    payload.pageFamily !== "week-social" &&
    payload.pageFamily !== "social-profile" &&
    payload.pageFamily !== "reddit-sources" &&
    payload.pageFamily !== "cast-socialblade" &&
    payload.pageFamily !== "system-health"
  ) {
    return false;
  }
  if (payload.pageFamily === "system-health") {
    return payload.scope == null || typeof payload.scope === "string";
  }
  return typeof payload.scope === "string" && payload.scope.trim().length > 0;
};

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = (await request.json().catch(() => ({}))) as { families?: unknown };
    const families = Array.isArray(body.families)
      ? body.families.filter(isValidFamilyPayload)
      : [];
    if (families.length === 0) {
      return NextResponse.json({ error: "families are required" }, { status: 400 });
    }
    const invalidated = invalidateAdminSnapshotFamilies(families);
    return NextResponse.json({ ok: true, invalidated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
