import { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function RegisterLayout({ children }: { children: ReactNode }) {
  // If already signed in, send users to the appropriate destination server-side.
  try {
    const { adminAuth, adminDb } = await import("@/lib/firebaseAdmin");
    const cookieStore = await cookies();
    const cookie = cookieStore.get("__session")?.value;
    if (cookie) {
      const decoded = await adminAuth.verifySessionCookie(cookie, true);
      const uid = decoded.uid;
      const snap = await adminDb.collection("users").doc(uid).get();
      if (!snap.exists) redirect("/auth/finish");
      const data = snap.data();
      const complete = data && data.username && Array.isArray(data.shows) && data.shows.length >= 3 && data.birthday;
      redirect(complete ? "/hub" : "/auth/finish");
    }
  } catch {
    // fall through to render the public page
  }
  return children;
}
