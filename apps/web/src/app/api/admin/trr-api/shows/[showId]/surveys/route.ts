import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import type { AuthContext } from "@/lib/server/postgres";
import { getSurveysByTrrShowId } from "@/lib/server/surveys/survey-trr-links-repository";
import {
  createSurveyFromShow,
  type SurveyTemplate,
} from "@/lib/server/surveys/create-survey-from-show";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ showId: string }>;
}

/**
 * GET /api/admin/trr-api/shows/[showId]/surveys
 *
 * List all surveys linked to a TRR show.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { showId } = await params;

    if (!showId) {
      return NextResponse.json(
        { error: "showId is required" },
        { status: 400 }
      );
    }

    const surveys = await getSurveysByTrrShowId(showId);

    return NextResponse.json({ surveys });
  } catch (error) {
    console.error("[api] Failed to list surveys for TRR show", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/admin/trr-api/shows/[showId]/surveys
 *
 * Create a new survey linked to a TRR show.
 *
 * Request body:
 * - seasonNumber: number (required)
 * - template: "cast_ranking" | "weekly_poll" | "episode_rating" (required)
 * - title: string (optional)
 * - createInitialRun: boolean (optional, default false)
 * - runStartsAt: string ISO date (optional)
 * - runEndsAt: string ISO date (optional)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAdmin(request);
    const authContext: AuthContext = { firebaseUid: user.uid, isAdmin: true };

    const { showId } = await params;

    if (!showId) {
      return NextResponse.json(
        { error: "showId is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      seasonNumber,
      template,
      title,
      createInitialRun,
      runStartsAt,
      runEndsAt,
    } = body;

    // Validate required fields
    if (typeof seasonNumber !== "number" || seasonNumber < 1) {
      return NextResponse.json(
        { error: "seasonNumber must be a positive integer" },
        { status: 400 }
      );
    }

    const validTemplates: SurveyTemplate[] = [
      "cast_ranking",
      "weekly_poll",
      "episode_rating",
    ];
    if (!validTemplates.includes(template)) {
      return NextResponse.json(
        { error: `template must be one of: ${validTemplates.join(", ")}` },
        { status: 400 }
      );
    }

    const result = await createSurveyFromShow(authContext, {
      trrShowId: showId,
      seasonNumber,
      template,
      title,
      createInitialRun: createInitialRun ?? false,
      runStartsAt,
      runEndsAt,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("[api] Failed to create survey from TRR show", error);
    const message = error instanceof Error ? error.message : "failed";

    // Handle specific error cases
    if (message.includes("already exists")) {
      return NextResponse.json({ error: message }, { status: 409 }); // Conflict
    }
    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
