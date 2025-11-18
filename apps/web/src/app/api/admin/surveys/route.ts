import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/auth";
import { listSurveys } from "@/lib/server/surveys/fetch";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const items = await listSurveys();
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[api] Failed to list surveys", error);
    const message = error instanceof Error ? error.message : "failed";
    const status = message === "unauthorized" ? 401 : message === "forbidden" ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
