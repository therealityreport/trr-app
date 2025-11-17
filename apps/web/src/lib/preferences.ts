import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export type RealiteasePrefs = {
  ageOrZodiac?: "age" | "zodiac";
  serviceMode?: "networks" | "streamers";
};

export type BravodlePrefs = {
  ageOrZodiac?: "age" | "zodiac";
};

export type UserPreferences = {
  realitease?: RealiteasePrefs;
  bravodle?: BravodlePrefs;
};

const COLLECTION = "user_preferences";

export async function getUserPreferences(uid: string): Promise<UserPreferences> {
  if (!uid) return {};
  const ref = doc(db, COLLECTION, uid);
  const snap = await getDoc(ref);
  return (snap.exists() ? (snap.data() as UserPreferences) : {}) ?? {};
}

export async function updateUserPreferences(uid: string, patch: Partial<UserPreferences>): Promise<void> {
  if (!uid) return;
  const ref = doc(db, COLLECTION, uid);
  await setDoc(ref, patch, { merge: true });
}

