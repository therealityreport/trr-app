import { NextResponse } from "next/server";
import { getTypographyState } from "@/lib/server/admin/typography-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await getTypographyState();
    return NextResponse.json(state);
  } catch (error) {
    console.error("[api] Failed to load public typography state", error);
    const message = error instanceof Error ? error.message : "failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
