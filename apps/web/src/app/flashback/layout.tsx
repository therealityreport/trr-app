import { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function guard() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("__session")?.value ?? null;

  if (!sessionCookie) {
    redirect("/auth/register");
  }

  const useEmulators = (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS ?? "false").toLowerCase() === "true";
  const hasServiceAccount = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT) || useEmulators;

  // Avoid unstable redirect loops when Admin credentials are unavailable.
  if (!hasServiceAccount) {
    return;
  }

  try {
    const { adminAuth, adminDb } = await import("@/lib/firebaseAdmin");
    const decoded =
      (await adminAuth.verifySessionCookie(sessionCookie, true).catch(() =>
        adminAuth.verifyIdToken(sessionCookie, true),
      )) ?? null;

    if (!decoded?.uid) {
      redirect("/auth/register");
    }

    const snap = await adminDb.collection("users").doc(decoded.uid).get();
    if (!snap.exists) {
      redirect("/auth/finish");
    }

    const data = snap.data();
    const complete = data && data.username && Array.isArray(data.shows) && data.shows.length >= 3 && data.birthday;
    if (!complete) {
      redirect("/auth/finish");
    }
  } catch {
    redirect("/auth/register");
  }
}

export default async function FlashbackLayout({ children }: { children: ReactNode }) {
  await guard();
  return children;
}
