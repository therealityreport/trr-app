import { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function guard() {
  const { adminAuth, adminDb } = await import("@/lib/firebaseAdmin");
  const cookieStore = await cookies();
  const cookie = cookieStore.get("__session")?.value;
  if (!cookie) redirect("/auth/register");
  try {
    const decoded = await adminAuth.verifySessionCookie(cookie, true);
    const uid = decoded.uid;
    const snap = await adminDb.collection("users").doc(uid).get();
    if (!snap.exists) redirect("/auth/finish");
    const data = snap.data();
    const complete = data && data.username && Array.isArray(data.shows) && data.shows.length >= 3 && data.birthday;
    if (!complete) redirect("/auth/finish");
  } catch {
    redirect("/auth/register");
  }
}

export default async function RealiteaseLayout({ children }: { children: ReactNode }) {
  await guard();
  return children;
}
