import { NextRequest, NextResponse } from "next/server";

import {
  createFlashbackEvent,
  listFlashbackEvents,
} from "@/lib/server/admin/flashback-admin-repository";
import { requireAdmin, toVerifiedAdminContext } from "@/lib/server/auth";
import { AdminReadProxyError } from "@/lib/server/trr-api/admin-read-proxy";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ quizId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const adminContext = toVerifiedAdminContext(await requireAdmin(request));
    const { quizId } = await params;
    const events = await listFlashbackEvents(adminContext, quizId);
    return NextResponse.json({ events });
  } catch (error) {
    console.error("[api/admin/flashback/quizzes/[quizId]/events] Failed to list events", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      error instanceof AdminReadProxyError
        ? error.status
        : message === "unauthorized"
          ? 401
          : message === "forbidden"
            ? 403
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const adminContext = toVerifiedAdminContext(await requireAdmin(request));
    const { quizId } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      description?: string;
      year?: number | string;
      image_url?: string | null;
      point_value?: number | string;
    };

    const description = body.description?.trim();
    const year = typeof body.year === "number" ? body.year : Number.parseInt(String(body.year ?? ""), 10);
    const pointValue =
      typeof body.point_value === "number"
        ? body.point_value
        : Number.parseInt(String(body.point_value ?? ""), 10);

    if (!description) {
      return NextResponse.json({ error: "description is required" }, { status: 400 });
    }
    if (!Number.isInteger(year)) {
      return NextResponse.json({ error: "year must be an integer" }, { status: 400 });
    }
    if (!Number.isInteger(pointValue) || pointValue < 2 || pointValue > 5) {
      return NextResponse.json({ error: "point_value must be between 2 and 5" }, { status: 400 });
    }

    const event = await createFlashbackEvent(adminContext, {
      quizId,
      description,
      year,
      imageUrl: body.image_url ?? null,
      pointValue,
    });
    if (!event) {
      return NextResponse.json({ error: "quiz not found" }, { status: 404 });
    }
    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    console.error("[api/admin/flashback/quizzes/[quizId]/events] Failed to create event", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      error instanceof AdminReadProxyError
        ? error.status
        : message === "unauthorized"
          ? 401
          : message === "forbidden"
            ? 403
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
