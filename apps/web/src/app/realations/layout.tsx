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
    if (!snap.exists) redirect("/auth/complete");
  } catch {
    redirect("/auth/register");
  }
}

export default async function RealationsLayout({ children }: { children: ReactNode }) {
  await guard();
  return children as unknown as JSX.Element;
}