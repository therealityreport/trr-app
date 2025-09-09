// Server-only Firebase Admin initialization
import "server-only";
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
  if (USE_EMULATORS) {
    // No credentials needed for local emulators
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_PROJECT_ID
      || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
      || "demo-trr";
    initializeApp({ projectId });
    return;
  }
  if (sa) {
    const creds = JSON.parse(sa);
    initializeApp({ credential: cert(creds), projectId: creds.project_id });
  } else {
    // For development without service account, we'll disable admin features
    // This prevents the app from trying to use ADC and failing
    console.warn("Firebase Admin SDK: No service account provided. Some features will be disabled.");
    // Initialize with minimal config to prevent crashes
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (projectId) {
      initializeApp({ projectId });
    }
  }
}

initAdmin();

export const adminAuth = getAuth();
export const adminDb = getFirestore();
