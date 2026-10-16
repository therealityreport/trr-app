import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { adminDb } from "@/lib/firebaseAdmin";
import { validateUsername } from "@/lib/validation/user";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (user.provider !== "firebase") return NextResponse.json({ error: "Firebase sign-in required" }, { status: 403 });
    const username = request.nextUrl.searchParams.get("username") ?? "";
    if (validateUsername(username)) return NextResponse.json({ error: "Invalid username" }, { status: 400 });
    const matches = await adminDb.collection("users").where("username", "==", username).limit(2).get();
    return NextResponse.json({ available: matches.docs.every((doc) => doc.id === user.uid) }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "unauthorized";
    return NextResponse.json({ error: unauthorized ? "unauthorized" : "Username lookup unavailable" }, { status: unauthorized ? 401 : 503 });
  }
}
