import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { isAdminGameKey } from "@/lib/admin/games";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

type ProblemReportApiRecord = {
  id: string;
  game: string;
  puzzleDate: string;
  category: string;
  description: string;
  userId: string;
  createdAt: string | null;
  updatedAt: string | null;
};

function normalizeLimit(raw: string | null): number {
  if (!raw) return DEFAULT_LIMIT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(parsed, MAX_LIMIT);
}

function toIsoOrNull(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const maybeTimestamp = value as { toDate?: () => Date };
  if (typeof maybeTimestamp.toDate !== "function") return null;
  try {
    return maybeTimestamp.toDate().toISOString();
  } catch {
    return null;
  }
}

function toSafeString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const game = (request.nextUrl.searchParams.get("game") ?? "").trim().toLowerCase();
    if (game && !isAdminGameKey(game)) {
      return NextResponse.json({ error: "invalid_game" }, { status: 400 });
    }

    const limit = normalizeLimit(request.nextUrl.searchParams.get("limit"));
    const fetchLimit = game ? Math.min(MAX_LIMIT, Math.max(limit * 2, limit)) : limit;

    const { adminDb } = await import("@/lib/firebaseAdmin");
    const snapshot = await adminDb
      .collection("problem_reports")
      .orderBy("createdAt", "desc")
      .limit(fetchLimit)
      .get();

    const reports: ProblemReportApiRecord[] = [];

    snapshot.forEach((docSnap) => {
      const data = (docSnap.data() ?? {}) as Record<string, unknown>;
      const normalized: ProblemReportApiRecord = {
        id: docSnap.id,
        game: toSafeString(data.game).toLowerCase(),
        puzzleDate: toSafeString(data.puzzleDate),
        category: toSafeString(data.category),
        description: toSafeString(data.description),
        userId: toSafeString(data.userId),
        createdAt: toIsoOrNull(data.createdAt),
        updatedAt: toIsoOrNull(data.updatedAt),
      };

      if (game && normalized.game !== game) {
        return;
      }
      reports.push(normalized);
    });

    return NextResponse.json({ reports: reports.slice(0, limit) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    console.error("[api/admin/games/problem-reports] failed", error);
    return NextResponse.json({ error: message }, { status });
  }
}
