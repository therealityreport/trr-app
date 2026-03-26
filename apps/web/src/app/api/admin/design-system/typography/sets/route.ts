import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { createTypographySet } from "@/lib/server/admin/typography-repository";
import { invalidateTypographyRouteCaches } from "@/lib/server/admin/typography-route-cache";
import {
  parseRequiredString,
  parseTypographyArea,
  parseTypographyRoles,
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

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    const body = await request.json();
    const created = await createTypographySet({
      name: parseRequiredString(body?.name, "name"),
      area: parseTypographyArea(body?.area),
      seedSource: parseRequiredString(body?.seedSource, "seedSource"),
      roles: parseTypographyRoles(body?.roles),
      ...(typeof body?.slug === "string" && body.slug.trim() ? { slug: body.slug.trim() } : {}),
    });
    invalidateTypographyRouteCaches();
    return NextResponse.json({ set: created }, { status: 201 });
  } catch (error) {
    console.error("[api] Failed to create typography set", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = getTypographyRequestStatus(message);
    return NextResponse.json({ error: message }, { status });
  }
}
