import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idToken } = body;
    
    console.log("Login API: Request body received", { 
      hasIdToken: !!idToken, 
      tokenLength: idToken?.length,
      tokenPreview: idToken?.substring(0, 20) + "..." 
    });
    
    if (typeof idToken !== "string" || idToken.length < 20) {
      console.error("Login API: Invalid token", { 
        tokenType: typeof idToken,
        tokenLength: idToken?.length,
        bodyKeys: Object.keys(body)
      });
      return NextResponse.json({ error: "invalid token" }, { status: 400 });
    }
    
    // Check if we have proper admin credentials
    const hasServiceAccount = !!process.env.FIREBASE_SERVICE_ACCOUNT;
    const useEmulators = (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS ?? "false").toLowerCase() === "true";
    
    console.log("Login API: Environment check", { hasServiceAccount, useEmulators });
    
    if (!hasServiceAccount && !useEmulators) {
      console.warn("Login API: No Firebase service account configured, skipping session cookie");
      // Return success without creating session cookie
      // The app will rely on client-side Firebase Auth instead
      return NextResponse.json({ ok: true, warning: "no_session_cookie" });
    }
    
    console.log("Login API: Creating session cookie");
    const expiresIn = 14 * 24 * 60 * 60 * 1000; // 14 days
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });
    
    console.log("Login API: Session cookie created successfully");
    const res = NextResponse.json({ ok: true });
    // Use __session for widest platform compatibility
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

