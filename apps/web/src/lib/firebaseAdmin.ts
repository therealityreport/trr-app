// Server-only Firebase Admin initialization
import { getApps, initializeApp, applicationDefault, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const USE_EMULATORS = (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS ?? "false").toLowerCase() === "true";

if (USE_EMULATORS) {
  // Ensure Admin SDK targets emulators when flag is on
  process.env.FIREBASE_AUTH_EMULATOR_HOST ||= "localhost:9099";
  process.env.FIRESTORE_EMULATOR_HOST ||= "localhost:8080";
}

function initAdmin() {
  if (getApps().length) return;
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (sa) {
    const creds = JSON.parse(sa);
    initializeApp({ credential: cert(creds), projectId: creds.project_id });
  } else {
    initializeApp({ credential: applicationDefault(), projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID });
  }
}

initAdmin();

export const adminAuth = getAuth();
export const adminDb = getFirestore();

