import { getDb } from "@/lib/firebase-db";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import type { UserProfile } from "@/lib/validation/user";

const USERS = "users" as const;

export async function getUserByUsername(username: string): Promise<UserProfile | null> {
  const q = query(collection(getDb(), USERS), where("username", "==", username), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return docSnap.data() as UserProfile;
}

export async function createUserProfile(
  uid: string,
  data: Omit<UserProfile, "uid" | "createdAt" | "updatedAt">,
): Promise<void> {
  const ref = doc(getDb(), USERS, uid);
  await setDoc(ref, {
    uid,
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function upsertUserProfile(uid: string, partial: Partial<UserProfile>): Promise<void> {
  const ref = doc(getDb(), USERS, uid);
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
  const ref = doc(getDb(), USERS, uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function checkUserExists(email: string): Promise<boolean> {
  const q = query(collection(getDb(), USERS), where("email", "==", email), limit(1));
  const snap = await getDocs(q);
  return !snap.empty;
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
