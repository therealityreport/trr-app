import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import type { AuthenticatedUser } from "@/lib/server/auth";
import { ProfileError, type ProfilePatch } from "@/lib/profile-contract";

const users = () => adminDb.collection("users");
const claims = () => adminDb.collection("username_claims");
type UsernameStatus = "reserved" | "conflict" | "unreserved";

export async function usernameAvailability(uid: string, username: string): Promise<boolean> {
  const [claim, matches] = await Promise.all([
    claims().doc(username).get(), users().where("username", "==", username).limit(2).get(),
  ]);
  return (!claim.exists || claim.data()?.uid === uid) && matches.docs.every(doc => doc.id === uid);
}

export async function readProfile(uid: string) {
  const snapshot = await users().doc(uid).get();
  if (!snapshot.exists) return null;
  const data = snapshot.data()!;
  let usernameStatus: UsernameStatus = "unreserved";
  if (typeof data.username === "string" && /^[a-z0-9_]{3,20}$/.test(data.username)) {
    const [claim, matches] = await Promise.all([
      claims().doc(data.username).get(), users().where("username", "==", data.username).limit(2).get(),
    ]);
    const conflict = matches.docs.some(doc => doc.id !== uid) || (claim.exists && claim.data()?.uid !== uid);
    usernameStatus = conflict ? "conflict" : claim.data()?.uid === uid ? "reserved" : "unreserved";
  }
  const strings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  return { ...data, uid, shows: strings(data.shows), showRequests: strings(data.showRequests), usernameStatus };
}

export async function updateProfile(user: AuthenticatedUser, patch: ProfilePatch): Promise<void> {
  const profileRef = users().doc(user.uid);
  await adminDb.runTransaction(async transaction => {
    const snapshot = await transaction.get(profileRef);
    const existing = snapshot.data() ?? {};
    const oldUsername = typeof existing.username === "string" ? existing.username : "";
    const username = patch.username;
    // Every claim and legacy-name read precedes every write in the transaction.
    const claimRef = username ? claims().doc(username) : null;
    const claim = claimRef ? await transaction.get(claimRef) : null;
    const matches = username ? await transaction.get(users().where("username", "==", username).limit(2)) : null;
    const changing = username !== undefined && username !== oldUsername;
    const oldClaimRef = changing && /^[a-z0-9_]{3,20}$/.test(oldUsername) ? claims().doc(oldUsername) : null;
    const oldClaim = oldClaimRef ? await transaction.get(oldClaimRef) : null;
    const conflict = Boolean(username && (matches?.docs.some(doc => doc.id !== user.uid) || (claim?.exists && claim.data()?.uid !== user.uid)));
    if (changing && conflict) throw new ProfileError("That username is taken. Try another.", 409, "profile/username-taken");

    const identity = user.token.firebase as { sign_in_provider?: unknown } | undefined;
    const data: Record<string, unknown> = {
      ...patch, uid: user.uid, email: user.email ?? null,
      provider: typeof identity?.sign_in_provider === "string" ? identity.sign_in_provider : "firebase",
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (!snapshot.exists) data.createdAt = FieldValue.serverTimestamp();
    if (patch.livesInUS === true) data.country = FieldValue.delete();
    if (patch.livesInUS === false) data.state = FieldValue.delete();
    // Unchanged legacy duplicates remain usable but are never represented as reserved.
    if (claimRef && !conflict && !claim?.exists) transaction.create(claimRef, { uid: user.uid });
    if (oldClaimRef && oldClaim?.data()?.uid === user.uid) transaction.delete(oldClaimRef);
    transaction.set(profileRef, data, { merge: true });
  }).catch(async (error: unknown) => {
    // A competing creation must not overwrite a reservation, even if the
    // database reports the create precondition before retrying the transaction.
    if ((error as { code?: unknown })?.code === 6 && patch.username &&
        !(await usernameAvailability(user.uid, patch.username))) {
      throw new ProfileError("That username is taken. Try another.", 409, "profile/username-taken");
    }
    throw error;
  });
}
