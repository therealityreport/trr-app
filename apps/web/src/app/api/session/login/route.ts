import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

const UNSUPPORTED_SUPABASE_SESSION_MESSAGE =
  "TRR_AUTH_PROVIDER=supabase is not supported for durable login/session cookies; Firebase must issue __session.";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idToken } = body;

    if (typeof idToken !== "string" || idToken.length < 20) {
      return NextResponse.json({ error: "invalid token" }, { status: 400 });
    }

    const authProvider = (process.env.TRR_AUTH_PROVIDER ?? "firebase").trim().toLowerCase() === "supabase"
      ? "supabase"
      : "firebase";
    const authShadowMode = (process.env.TRR_AUTH_SHADOW_MODE ?? "false").toLowerCase() === "true";

    if (authProvider === "supabase") {
      console.error("Login API: Unsupported durable auth provider configuration", {
        authProvider,
      });
      return NextResponse.json(
        {
          error: "unsupported_auth_provider",
          message: UNSUPPORTED_SUPABASE_SESSION_MESSAGE,
          provider: authProvider,
          shadowMode: authShadowMode,
        },
        { status: 501 },
      );
    }

    const hasServiceAccount = !!process.env.FIREBASE_SERVICE_ACCOUNT;
    const useEmulators = (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS ?? "false").toLowerCase() === "true";

    if (!hasServiceAccount && !useEmulators) {
      return NextResponse.json({ ok: true, warning: "no_session_cookie", provider: authProvider, shadowMode: authShadowMode });
    }

    const expiresIn = 14 * 24 * 60 * 60 * 1000; // 14 days
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    const res = NextResponse.json({ ok: true, provider: authProvider, shadowMode: authShadowMode });
    res.cookies.set("__session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: Math.floor(expiresIn / 1000),
      path: "/",
    });
    return res;
  } catch (error) {
    console.error("Login API: Failed to create session cookie", error);
    return NextResponse.json({ error: "failed" }, { status: 400 });
  }
}
