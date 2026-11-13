// Run only through the isolated demo-project emulator command in the repair receipt.
import { afterAll, describe, expect, it, vi } from "vitest";
import { initializeApp as initializeAdmin, deleteApp as deleteAdmin } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { initializeApp, deleteApp } from "firebase/app";
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore as clientFirestore, connectFirestoreEmulator, doc, setDoc, getDoc, updateDoc, serverTimestamp, terminate } from "firebase/firestore";
import type { AuthenticatedUser } from "@/lib/server/auth";

const enabled = process.env.TRR_PROFILE_EMULATOR_TEST === "1";
if (enabled && (![process.env.FIRESTORE_EMULATOR_HOST, process.env.FIREBASE_AUTH_EMULATOR_HOST]
  .every(host => /^(127\.0\.0\.1|localhost):\d+$/.test(host ?? "")))) {
  throw new Error("Profile integration tests require isolated loopback Firestore and Auth emulators.");
}
const projectId = "demo-trr-profile-repair";
const adminApp = initializeAdmin({ projectId }, "profile-repair-tests");
const db = getFirestore(adminApp);
vi.mock("@/lib/firebaseAdmin", () => ({ get adminDb() { return db; } }));
const user = (uid: string): AuthenticatedUser => ({ uid, email: `${uid}@example.test`, provider: "firebase", token: { uid, firebase: { sign_in_provider: "password" } } });
const seed = async (uid: string, username: string) => db.collection("users").doc(uid).set({ uid, username, createdAt: Timestamp.fromMillis(1234), updatedAt: Timestamp.fromMillis(1234), name: "Keep", birthday: "2000-01-01", shows: ["A", "B", "C"] });
afterAll(async () => { await db.terminate(); await deleteAdmin(adminApp); });

describe.skipIf(!enabled)("atomic profiles with actual Firestore transactions and rules", () => {
  it("uses only the isolated loopback emulator", () => {
    expect(process.env.FIRESTORE_EMULATOR_HOST).toMatch(/^(127\.0\.0\.1|localhost):/);
    expect(process.env.FIREBASE_AUTH_EMULATOR_HOST).toMatch(/^(127\.0\.0\.1|localhost):/);
  });
  it("allows exactly one concurrent claimant", async () => {
    const { updateProfile } = await import("@/lib/server/profile-repository");
    const results = await Promise.allSettled([updateProfile(user("claimant1"), { username: "shared_name" }), updateProfile(user("claimant2"), { username: "shared_name" })]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find(result => result.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason.status).toBe(409);
    const matches = await db.collection("users").where("username", "==", "shared_name").get();
    expect(matches.size).toBe(1);
    expect((await db.collection("username_claims").doc("shared_name").get()).data()?.uid).toBe(matches.docs[0].id);
  });
  it("protects legacy names and preserves existing duplicates", async () => {
    const { updateProfile, readProfile, usernameAvailability } = await import("@/lib/server/profile-repository");
    await seed("legacy1", "legacy_name"); await seed("legacy2", "legacy_name");
    expect(await usernameAvailability("newcomer", "legacy_name")).toBe(false);
    await expect(updateProfile(user("newcomer"), { username: "legacy_name" })).rejects.toMatchObject({ status: 409 });
    await updateProfile(user("legacy1"), { username: "legacy_name", name: "Changed" });
    expect(await readProfile("legacy1")).toMatchObject({ username: "legacy_name", usernameStatus: "conflict", name: "Changed" });
    expect((await db.collection("users").doc("legacy1").get()).data()?.createdAt.toMillis()).toBe(1234);
    await updateProfile(user("legacy1"), { username: "unique_name" });
    expect(await readProfile("legacy1")).toMatchObject({ usernameStatus: "reserved" });
    expect((await db.collection("users").doc("legacy2").get()).data()?.username).toBe("legacy_name");
  });
  it("preserves untouched fields, clears obsolete location and releases only owned claims", async () => {
    const { updateProfile } = await import("@/lib/server/profile-repository");
    await seed("moving", "old_name");
    await db.collection("username_claims").doc("old_name").set({ uid: "moving" });
    await updateProfile(user("moving"), { livesInUS: true, state: "New York", country: "Canada" });
    expect((await db.collection("users").doc("moving").get()).data()).toMatchObject({ state: "New York", name: "Keep", shows: ["A", "B", "C"] });
    expect((await db.collection("users").doc("moving").get()).data()).not.toHaveProperty("country");
    await updateProfile(user("moving"), { username: "moved_name", livesInUS: false, country: "Canada" });
    expect((await db.collection("users").doc("moving").get()).data()).not.toHaveProperty("state");
    expect((await db.collection("username_claims").doc("old_name").get()).exists).toBe(false);
    await db.collection("username_claims").doc("moved_name").set({ uid: "another-owner" });
    await updateProfile(user("moving"), { username: "third_name" });
    expect((await db.collection("username_claims").doc("moved_name").get()).data()?.uid).toBe("another-owner");
  });
  it("denies client username and claim writes but permits ordinary owner updates", async () => {
    const app = initializeApp({ projectId, apiKey: "demo-key" }, "profile-rules-client");
    const auth = getAuth(app);
    connectAuthEmulator(auth, `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
    const firestore = clientFirestore(app);
    const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(":");
    connectFirestoreEmulator(firestore, host, Number(port));
    try {
      const { user: signedIn } = await createUserWithEmailAndPassword(auth, "rules@example.test", "TestPassword123!");
      const ref = doc(firestore, "users", signedIn.uid);
      const identity = { uid: signedIn.uid, email: signedIn.email, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
      await expect(setDoc(ref, { ...identity, username: "client_name" })).rejects.toMatchObject({ code: "permission-denied" });
      await setDoc(ref, { ...identity, name: "Owner" });
      await expect(updateDoc(ref, { username: "client_name" })).rejects.toMatchObject({ code: "permission-denied" });
      await updateDoc(ref, { name: "Changed", updatedAt: serverTimestamp() });
      expect((await getDoc(ref)).data()?.name).toBe("Changed");
      await expect(setDoc(doc(firestore, "username_claims", "client_name"), { uid: signedIn.uid })).rejects.toMatchObject({ code: "permission-denied" });
      await expect(getDoc(doc(firestore, "username_claims", "client_name"))).rejects.toMatchObject({ code: "permission-denied" });
    } finally { await terminate(firestore); await deleteApp(app); }
  });
});
