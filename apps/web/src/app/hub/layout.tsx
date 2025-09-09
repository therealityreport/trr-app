import { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function guard() {
  const { adminAuth, adminDb } = await import("@/lib/firebaseAdmin");
  const cookieStore = await cookies();
  const cookie = cookieStore.get("__session")?.value;
  
  // Check if we have proper admin credentials
  const hasServiceAccount = !!process.env.FIREBASE_SERVICE_ACCOUNT;
  const useEmulators = (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS ?? "false").toLowerCase() === "true";
  
  console.log("Hub guard: Starting server-side auth check", { 
    hasServiceAccount, 
    useEmulators, 
    hasCookie: !!cookie 
  });
  
  if (!hasServiceAccount && !useEmulators) {
    // No admin credentials available, skip server-side auth check
    // The client-side auth will handle routing
    console.log("Hub guard: No Firebase admin credentials, skipping server-side auth check");
    return;
  }
  
  if (!cookie) {
    console.log("Hub guard: No session cookie, redirecting to register");
    redirect("/auth/register");
  }
  
  try {
    console.log("Hub guard: Verifying session cookie");
    const decoded = await adminAuth.verifySessionCookie(cookie, true);
    const uid = decoded.uid;
    console.log("Hub guard: Session valid, checking user profile for uid:", uid.substring(0, 8));
    
    const snap = await adminDb.collection("users").doc(uid).get();
    if (!snap.exists) {
      console.log("Hub guard: User profile not found, redirecting to finish");
      redirect("/auth/finish");
    }
    
    const data = snap.data();
    const complete = data && data.username && Array.isArray(data.shows) && data.shows.length >= 3 && data.birthday;
    console.log("Hub guard: Profile check result", { complete });
    
    if (!complete) {
      console.log("Hub guard: Profile incomplete, redirecting to finish");
      redirect("/auth/finish");
    }
    
    console.log("Hub guard: All checks passed, allowing access to hub");
  } catch (error) {
    console.log("Hub guard: Session verification failed, redirecting to register", error);
    redirect("/auth/register");
  }
}

export default async function HubLayout({ children }: { children: ReactNode }) {
  await guard();
  return children;
}
