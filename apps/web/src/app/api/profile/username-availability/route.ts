import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { usernameAvailability } from "@/lib/server/profile-repository";
import { validateUsername } from "@/lib/validation/user";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (user.provider !== "firebase") return NextResponse.json({ error: "Firebase sign-in required" }, { status: 403 });
    const username = (request.nextUrl.searchParams.get("username") ?? "").trim().toLowerCase();
    if (validateUsername(username)) return NextResponse.json({ error: "Invalid username" }, { status: 400 });
    return NextResponse.json({ available: await usernameAvailability(user.uid, username) }, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    const unauthorized = error instanceof Error && error.message === "unauthorized";
    return NextResponse.json({ error: unauthorized ? "unauthorized" : "Username lookup unavailable" }, { status: unauthorized ? 401 : 503 });
  }
}
