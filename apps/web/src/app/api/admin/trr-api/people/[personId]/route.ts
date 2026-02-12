import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import {
  getPersonById,
  updatePersonCanonicalProfileSourceOrder,
} from "@/lib/server/trr-api/trr-shows-repository";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ personId: string }>;
}

/**
 * GET /api/admin/trr-api/people/[personId]
 *
 * Get person details from TRR Core API.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { personId } = await params;

    if (!personId) {
      return NextResponse.json(
        { error: "personId is required" },
        { status: 400 }
      );
    }

    const person = await getPersonById(personId);

    if (!person) {
      return NextResponse.json(
        { error: "Person not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ person });
  } catch (error) {
    console.error("[api] Failed to get TRR person", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * PATCH /api/admin/trr-api/people/[personId]
 *
 * Update person-level admin preferences.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);

    const { personId } = await params;
    if (!personId) {
      return NextResponse.json(
        { error: "personId is required" },
        { status: 400 }
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      canonicalProfileSourceOrder?: unknown;
    };

    if (!Array.isArray(body.canonicalProfileSourceOrder)) {
      return NextResponse.json(
        { error: "canonicalProfileSourceOrder must be an array" },
        { status: 400 }
      );
    }

    const sourceOrder = body.canonicalProfileSourceOrder
      .map((value) => (typeof value === "string" ? value.trim().toLowerCase() : ""))
      .filter((value) => value.length > 0);

    const person = await updatePersonCanonicalProfileSourceOrder(personId, sourceOrder);
    if (!person) {
      return NextResponse.json(
        { error: "Person not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ person });
  } catch (error) {
    console.error("[api] Failed to patch TRR person", error);
    const message = error instanceof Error ? error.message : "failed";
    const status =
      message === "unauthorized"
        ? 401
        : message === "forbidden"
          ? 403
          : message.startsWith("source_order_")
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
