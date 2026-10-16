import { auth } from "@/lib/firebase";
import { fetchSignInMethodsForEmail } from "firebase/auth";
import { requireDb } from "@/lib/firebase-db";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import type { UserProfile } from "@/lib/validation/user";

const USERS = "users" as const;

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in to check username availability.");
  const token = await user.getIdToken();
  const response = await fetch(`/api/profile/username-availability?username=${encodeURIComponent(username)}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Username availability is unavailable. Please retry.");
  const body = await response.json();
  if (typeof body.available !== "boolean") throw new Error("Invalid username availability response.");
  return body.available;
}

export async function createUserProfile(
  uid: string,
  data: Omit<UserProfile, "uid" | "createdAt" | "updatedAt">,
): Promise<void> {
  const ref = doc(requireDb(), USERS, uid);
  await setDoc(ref, {
    uid,
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function upsertUserProfile(uid: string, partial: Partial<UserProfile>): Promise<void> {
  const ref = doc(requireDb(), USERS, uid);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await setDoc(ref, { ...partial, updatedAt: serverTimestamp() }, { merge: true });
  } else {
    await setDoc(
      ref,
      {
        uid,
        ...partial,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const ref = doc(requireDb(), USERS, uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const profile = snap.data();
  // Owner-supplied private list entries remain untrusted at the read boundary.
  const strings = (value: unknown): string[] => Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
  return { ...profile, shows: strings(profile.shows), showRequests: strings(profile.showRequests) } as UserProfile;
}

export async function checkUserExists(email: string): Promise<boolean> {
  // Auth discovery may intentionally return [] under email enumeration protection.
  // Account creation handles email-already-in-use and offers the login stage.
  return (await fetchSignInMethodsForEmail(auth, email.trim())).length > 0;
}

export function isFirestoreUnavailableError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as { message?: unknown; code?: unknown; name?: unknown };
  const message = typeof candidate.message === "string" ? candidate.message.toLowerCase() : "";
  const code = typeof candidate.code === "string" ? candidate.code.toLowerCase() : "";
  const name = typeof candidate.name === "string" ? candidate.name.toLowerCase() : "";

  return (
    message.includes("service firestore is not available") ||
    code.includes("service/unavailable") ||
    code.includes("unavailable") ||
    name.includes("firebaseerror")
  );
}
