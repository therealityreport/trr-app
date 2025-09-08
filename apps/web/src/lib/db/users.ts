import { db } from "@/lib/firebase";
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
  const q = query(collection(db, USERS), where("username", "==", username), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return docSnap.data() as UserProfile;
}

export async function createUserProfile(
  uid: string,
  data: Omit<UserProfile, "uid" | "createdAt" | "updatedAt">,
): Promise<void> {
  const ref = doc(db, USERS, uid);
  await setDoc(ref, {
    uid,
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function upsertUserProfile(uid: string, partial: Partial<UserProfile>): Promise<void> {
  const ref = doc(db, USERS, uid);
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
  const ref = doc(db, USERS, uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserProfile) : null;
}