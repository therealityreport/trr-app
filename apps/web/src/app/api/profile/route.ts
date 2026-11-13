import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { parseProfilePatch, ProfileError } from "@/lib/profile-contract";
import { readProfile, updateProfile } from "@/lib/server/profile-repository";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
async function profileUser(request: NextRequest) {
  const user = await requireUser(request);
  if (user.provider !== "firebase") throw new ProfileError("Firebase sign-in required", 403, "profile/forbidden");
  return user;
}
function failure(error: unknown) {
  if (error instanceof ProfileError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.status, headers });
  if (error instanceof Error && error.message === "unauthorized") {
    return NextResponse.json({ error: "Sign in to manage your profile.", code: "profile/unauthorized" }, { status: 401, headers });
  }
  const code = (error as { code?: unknown } | null)?.code;
  const unavailable = code === 14 || code === "unavailable" || code === "firestore/unavailable";
  return NextResponse.json({ error: unavailable ? "Profile service is temporarily unavailable. Please retry." : "Unable to access your profile. Please retry.", code: unavailable ? "profile/unavailable" : "profile/failed" }, { status: unavailable ? 503 : 500, headers });
}
export async function GET(request: NextRequest) {
  try {
    const user = await profileUser(request);
    return NextResponse.json({ profile: await readProfile(user.uid) }, { headers });
  } catch (error) { return failure(error); }
}
export async function PATCH(request: NextRequest) {
  try {
    const user = await profileUser(request);
    const body: unknown = await request.json().catch(() => { throw new ProfileError("Invalid JSON body", 400, "profile/invalid-argument"); });
    await updateProfile(user, parseProfilePatch(body));
    // Do not turn a committed save into a failure if a later profile read fails.
    return NextResponse.json({ ok: true }, { headers });
  } catch (error) { return failure(error); }
}
