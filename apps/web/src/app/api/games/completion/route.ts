import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { InvalidGameCompletion, parseGameCompletion, recordGameCompletion } from "@/lib/server/games/completion";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (user.provider !== "firebase") return NextResponse.json({ error: "Firebase sign-in required" }, { status: 403 });
    if (Number(request.headers.get("content-length")) > 4096) return NextResponse.json({ error: "Event too large" }, { status: 413 });
    const text = await request.text();
    if (text.length > 4096) return NextResponse.json({ error: "Event too large" }, { status: 413 });
    const event = parseGameCompletion(JSON.parse(text));
    return NextResponse.json(await recordGameCompletion(adminDb, user.uid, event));
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "unauthorized";
    const invalid = error instanceof InvalidGameCompletion || error instanceof SyntaxError;
    return NextResponse.json({ error: unauthorized ? "unauthorized" : invalid ? "Invalid game completion" : "Completion sync unavailable. Please retry." }, {
      status: unauthorized ? 401 : invalid ? 400 : 503,
    });
  }
}
