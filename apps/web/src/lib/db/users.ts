import { auth } from "@/lib/firebase";
import { fetchSignInMethodsForEmail } from "firebase/auth";
import type { UserProfile } from "@/lib/validation/user";
import { EDITABLE_PROFILE_FIELDS } from "@/lib/profile-contract";

async function profileRequest(uid: string, path: string, options: RequestInit = {}) {
  const user = auth.currentUser;
  if (!user || user.uid !== uid) throw Object.assign(new Error("Sign in to manage your profile."), { code: "profile/unauthorized" });
  const token = await user.getIdToken();
  if (auth.currentUser?.uid !== uid) throw Object.assign(new Error("The signed-in account changed."), { code: "profile/unauthorized" });
  let response: Response;
  try {
    response = await fetch(path, {
      ...options, credentials: "omit", cache: "no-store",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...options.headers },
    });
  } catch (error) {
    if (error instanceof TypeError) throw Object.assign(new Error("Profile service is temporarily unavailable. Please retry."), { code: "profile/unavailable" });
    throw error;
  }
  const body = await response.json();
  if (!response.ok) throw Object.assign(new Error(body.error ?? "Unable to access your profile."), { code: body.code ?? (response.status === 503 ? "profile/unavailable" : "profile/failed") });
  return body;
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Sign in to check username availability.");
  const body = await profileRequest(uid, `/api/profile/username-availability?username=${encodeURIComponent(username)}`);
  if (typeof body.available !== "boolean") throw new Error("Invalid username availability response.");
  return body.available;
}

export async function createUserProfile(uid: string, data: Omit<UserProfile, "uid" | "createdAt" | "updatedAt">): Promise<void> {
  await upsertUserProfile(uid, data);
}

export async function upsertUserProfile(uid: string, partial: Partial<UserProfile>): Promise<void> {
  const editable = Object.fromEntries(EDITABLE_PROFILE_FIELDS.filter(key => partial[key] !== undefined).map(key => [key, partial[key]]));
  await profileRequest(uid, "/api/profile", { method: "PATCH", body: JSON.stringify(editable) });
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const body = await profileRequest(uid, "/api/profile");
  return body.profile ?? null;
}

export async function checkUserExists(email: string): Promise<boolean> {
  // Email enumeration protection can return []; account creation handles collisions.
  return (await fetchSignInMethodsForEmail(auth, email.trim())).length > 0;
}

export function isFirestoreUnavailableError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as { code?: unknown }).code;
  return code === "unavailable" || code === "firestore/unavailable" || code === "profile/unavailable";
}
