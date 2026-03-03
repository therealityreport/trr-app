import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireUser } from "@/lib/server/auth";

const MAX_DESCRIPTION_LENGTH = 2000;
const VALID_GAMES = new Set(["bravodle", "realitease"]);
const VALID_CATEGORIES = new Set([
  "technical",
  "incorrect-info",
  "accessibility",
  "content",
  "other",
]);
const REPORT_WINDOW_MS = 10 * 60 * 1000;
const REPORTS_PER_WINDOW = 5;
const FUTURE_DATE_GRACE_DAYS = 1;

const userRateLimit = new Map<string, { windowStartedAt: number; count: number }>();

type ProblemReportPayload = {
  game?: unknown;
  puzzleDate?: unknown;
  category?: unknown;
  description?: unknown;
};

function isIsoDate(value: string): boolean {
  return /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value);
}

function parseDateOnlyUtc(value: string): Date | null {
  const match = /^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function isFuturePuzzleDate(puzzleDate: string): boolean {
  const parsed = parseDateOnlyUtc(puzzleDate);
  if (!parsed) return true;

  const now = new Date();
  const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const maxAllowed = new Date(todayUtc.getTime() + FUTURE_DATE_GRACE_DAYS * 24 * 60 * 60 * 1000);
  return parsed.getTime() > maxAllowed.getTime();
}

function sanitizeDescription(value: string): string {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isRateLimited(uid: string): boolean {
  const now = Date.now();
  const current = userRateLimit.get(uid);
  if (!current || now - current.windowStartedAt >= REPORT_WINDOW_MS) {
    userRateLimit.set(uid, { windowStartedAt: now, count: 1 });
    return false;
  }

  if (current.count >= REPORTS_PER_WINDOW) {
    return true;
  }

  current.count += 1;
  userRateLimit.set(uid, current);
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (isRateLimited(user.uid)) {
      return NextResponse.json(
        { error: "Too many reports. Please wait a few minutes before trying again." },
        { status: 429 },
      );
    }

    const body = (await request.json()) as ProblemReportPayload;

    const game = typeof body.game === "string" ? body.game.trim().toLowerCase() : "";
    const puzzleDate = typeof body.puzzleDate === "string" ? body.puzzleDate.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "";
    const descriptionRaw = typeof body.description === "string" ? body.description : "";
    const description = sanitizeDescription(descriptionRaw);

    if (!VALID_GAMES.has(game)) {
      return NextResponse.json({ error: "Invalid game" }, { status: 400 });
    }
    if (!isIsoDate(puzzleDate)) {
      return NextResponse.json({ error: "Invalid puzzle date" }, { status: 400 });
    }
    if (isFuturePuzzleDate(puzzleDate)) {
      return NextResponse.json({ error: "Puzzle date cannot be in the future" }, { status: 400 });
    }
    if (!VALID_CATEGORIES.has(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    if (!description) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }
    if (description.length > MAX_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        { error: `Description must be <= ${MAX_DESCRIPTION_LENGTH} characters` },
        { status: 400 },
      );
    }

    const docRef = await adminDb.collection("problem_reports").add({
      game,
      puzzleDate,
      category,
      description,
      userId: user.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, reportId: docRef.id });
  } catch (error) {
    if (error instanceof Error && (error.message === "unauthorized" || error.message === "forbidden")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[games/report-problem] failed", error);
    return NextResponse.json({ error: "Unable to submit report" }, { status: 500 });
  }
}
