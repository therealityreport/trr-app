import { getApp, getApps, initializeApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";
import {
  FIREBASE_USE_EMULATORS,
  assertValidFirebaseClientConfig,
  firebaseClientConfig,
} from "@/lib/firebase-client-config";

assertValidFirebaseClientConfig();
const firestoreApp = getApps().length ? getApp() : initializeApp(firebaseClientConfig);

let dbInstance: Firestore | null = null;
let emulatorConnected = false;

export function getDb(): Firestore {
  if (!dbInstance) {
    dbInstance = getFirestore(firestoreApp);
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
