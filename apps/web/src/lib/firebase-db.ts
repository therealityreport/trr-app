import { getApp, getApps, initializeApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore, type Firestore } from "firebase/firestore";

const FIREBASE_USE_EMULATORS =
  (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS ?? "false").toLowerCase() === "true";
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: FIREBASE_USE_EMULATORS
    ? (process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "")
    : (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? ""),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? undefined,
};
const firestoreApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

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
