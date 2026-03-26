import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { invalidateTypographyRouteCaches } from "@/lib/server/admin/typography-route-cache";
import {
  deleteTypographySet,
  updateTypographySet,
} from "@/lib/server/admin/typography-repository";
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

interface RouteParams {
  params: Promise<{ setId: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { setId } = await params;
    const body = await request.json();
    const updated = await updateTypographySet(parseRequiredString(setId, "setId"), {
      ...(body?.name !== undefined ? { name: parseRequiredString(body.name, "name") } : {}),
      ...(body?.area !== undefined ? { area: parseTypographyArea(body.area) } : {}),
      ...(body?.seedSource !== undefined ? { seedSource: parseRequiredString(body.seedSource, "seedSource") } : {}),
      ...(body?.roles !== undefined ? { roles: parseTypographyRoles(body.roles) } : {}),
    });

    if (!updated) {
      return NextResponse.json({ error: "Typography set not found" }, { status: 404 });
    }

    invalidateTypographyRouteCaches();
    return NextResponse.json({ set: updated });
  } catch (error) {
    console.error("[api] Failed to update typography set", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = getTypographyRequestStatus(message);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin(request);
    const { setId } = await params;
    const outcome = await deleteTypographySet(parseRequiredString(setId, "setId"));
    if (outcome === "missing") {
      return NextResponse.json({ error: "Typography set not found" }, { status: 404 });
    }
    if (outcome === "in-use") {
      return NextResponse.json({ error: "Typography set is still assigned" }, { status: 409 });
    }
    invalidateTypographyRouteCaches();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api] Failed to delete typography set", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = getTypographyRequestStatus(message);
    return NextResponse.json({ error: message }, { status });
  }
}
