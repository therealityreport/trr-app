import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import { app } from "@/lib/firebase";
import { FIREBASE_USE_EMULATORS } from "@/lib/firebase-client-config";

let dbInstance: Firestore | null = null;
let emulatorConnected = false;

let warnedUnavailable = false;

/**
 * Returns the Firestore instance, or `null` when Firestore is unavailable
 * (e.g. Firebase project doesn't have Firestore enabled, or running without
 * full Firebase config in local dev).
 */
export function getDb(): Firestore | null {
  if (!dbInstance) {
    try {
      dbInstance = getFirestore(app);
    } catch (err) {
      if (!warnedUnavailable) {
        console.warn(
          "[firebase] Firestore service is not available — Firestore-backed features will be disabled.",
          (err as Error)?.message,
        );
        warnedUnavailable = true;
      }
      return null;
    }
  }

  if (typeof window !== "undefined" && FIREBASE_USE_EMULATORS && !emulatorConnected) {
    try {
      connectFirestoreEmulator(dbInstance, "localhost", 8080);
      emulatorConnected = true;
    } catch (err) {
      console.log("Firestore emulator connection skipped:", (err as Error)?.message);
    }
  }

  return dbInstance;
}

/**
 * Like `getDb()` but throws when Firestore is unavailable.
 * Use in utility functions whose callers already have try/catch error handling.
 */
export function requireDb(): Firestore {
  const db = getDb();
  if (!db) {
    throw new Error("Firestore is not available — this feature requires Firebase Firestore.");
  }
  return db;
}
