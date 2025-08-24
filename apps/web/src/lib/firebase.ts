import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyB6nW8RFgYVAD_6snEXP7UHd9urCmzZW5o",
  authDomain: "trr-web-25d2e.firebaseapp.com",
  projectId: "trr-web-25d2e",
  storageBucket: "trr-web-25d2e.firebasestorage.app",
  messagingSenderId: "905543475184",
  appId: "1:905543475184:web:71df1fd0084d1055988735",
  measurementId: "G-4XRXF0QBYF",
};

// Initialize (or reuse) the Firebase app once per runtime
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Export singletons
export const db = getFirestore(app);
export const auth = getAuth(app);

// Auth state subscription helper
export function onUser(cb: (u: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

// Guard against duplicate sign-in popups and ignore benign cancellation errors
let signinInFlight = false;
export async function signInWithGoogle(): Promise<void> {
  if (signinInFlight) return;
  signinInFlight = true;
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (e: any) {
    if (
      e?.code !== "auth/cancelled-popup-request" &&
      e?.code !== "auth/popup-closed-by-user"
    ) {
      throw e;
    }
  } finally {
    signinInFlight = false;
  }
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

// Analytics (no-op on unsupported envs like some SSR contexts)
let analyticsInstance: Analytics | null = null;
export async function initAnalytics(): Promise<Analytics | null> {
  try {
    if (!analyticsInstance && (await isSupported())) {
      analyticsInstance = getAnalytics(app);
    }
  } catch {
    // ignore analytics init failures in unsupported environments
  }
  return analyticsInstance;
}