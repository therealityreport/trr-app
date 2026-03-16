import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { upsertTypographyAssignment } from "@/lib/server/admin/typography-repository";
import {
  parseOptionalString,
  parseRequiredString,
  parseTypographyArea,
} from "@/lib/server/admin/typography-validators";

export const dynamic = "force-dynamic";

function getTypographyRequestStatus(message: string): number {
  if (message === "unauthorized") return 401;
  if (message === "forbidden") return 403;
  if (
    message.includes("required")
    || message.startsWith("Invalid ")
    || message.startsWith("Expected ")
    || message.includes("roles must")
  ) {
    return 400;
  }
  return 500;
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const assignment = await upsertTypographyAssignment({
      area: parseTypographyArea(body?.area),
      pageKey: parseOptionalString(body?.pageKey),
      instanceKey: parseOptionalString(body?.instanceKey),
      setId: parseRequiredString(body?.setId, "setId"),
      sourcePath: parseRequiredString(body?.sourcePath, "sourcePath"),
      notes: parseOptionalString(body?.notes),
    });
    return NextResponse.json({ assignment });
  } catch (error) {
    console.error("[api] Failed to upsert typography assignment", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = getTypographyRequestStatus(message);
    return NextResponse.json({ error: message }, { status });
  }
}
