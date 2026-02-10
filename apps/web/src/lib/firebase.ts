import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import {
  getAuth,
  connectAuthEmulator,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

// Prefer environment variables for config; allow emulator project override
const USE_EMULATORS = (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS ?? "false").toLowerCase() === "true";
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: USE_EMULATORS
    ? (process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "")
    : (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? ""),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? undefined,
};

// Initialize (or reuse) the Firebase app once per runtime
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Export singletons
export const db = getFirestore(app);
export const auth = getAuth(app);

// Optional: connect to local emulators for development/testing
if (typeof window !== "undefined") {
  if (USE_EMULATORS) {
    try {
      connectFirestoreEmulator(db, "localhost", 8080);
    } catch (err) {
      console.log("Firestore emulator connection skipped:", (err as Error)?.message);
    }
    try {
      connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    } catch (err) {
      console.log("Auth emulator connection skipped:", (err as Error)?.message);
    }
  }
}

// Auth state subscription helper
export function onUser(cb: (u: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

type NormalizedAuthError = {
  code?: string;
  message?: string;
  name?: string;
};

function normalizeAuthError(err: unknown): NormalizedAuthError {
  if (typeof err === "string") return { message: err };
  if (typeof err !== "object" || err === null) return {};

  const anyErr = err as { code?: unknown; message?: unknown; name?: unknown };
  return {
    code: typeof anyErr.code === "string" ? anyErr.code : undefined,
    message: typeof anyErr.message === "string" ? anyErr.message : undefined,
    name: typeof anyErr.name === "string" ? anyErr.name : undefined,
  };
}

function isBenignPopupAuthError(code?: string, message?: string): boolean {
  return (
    code === "auth/cancelled-popup-request" ||
    code === "auth/popup-closed-by-user" ||
    code === "auth/popup-blocked" ||
    (typeof message === "string" && message.includes("Cross-Origin-Opener-Policy"))
  );
}

class AuthFlowError extends Error {
  code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = "AuthFlowError";
    this.code = code;
  }
}

// Guard against duplicate sign-in popups and ignore benign cancellation errors
let signinInFlight = false;
export async function signInWithGoogle(): Promise<boolean> {
  if (signinInFlight) return false;
  signinInFlight = true;
  try {
    const provider = new GoogleAuthProvider();
    // Always open account chooser, but remove birthday scope due to API permissions
    provider.setCustomParameters({ prompt: "select_account" });
    // Don't request birthday scope to avoid 403 errors
    // provider.addScope("https://www.googleapis.com/auth/user.birthday.read");
    
    const result = await signInWithPopup(auth, provider);

    // Skip Google People API call since it's causing 403 errors
    // The birthday field will be filled in the finish form instead
    
    // Establish a server session cookie for SSR guards
    const idToken = await result.user.getIdToken();
    
    if (idToken) {
      const response = await fetch("/api/session/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken }),
        credentials: "include",
      });
      
      if (!response.ok) {
        // Avoid console.error here; in dev Next treats console.error as an overlay-level error.
        console.warn("Session login failed:", response.status, await response.text());
      }
    } else {
      console.warn("No ID token available");
    }

    return true;
  } catch (err: unknown) {
    const { code, message } = normalizeAuthError(err);

    // Common local-dev footgun: Firebase auth authorizes "localhost" by default, but not "127.0.0.1".
    // If we detect that case, redirect to localhost so popup auth can proceed without a Firebase console change.
    if (
      code === "auth/unauthorized-domain" &&
      typeof window !== "undefined" &&
      process.env.NODE_ENV === "development" &&
      window.location.hostname === "127.0.0.1"
    ) {
      const url = new URL(window.location.href);
      url.hostname = "localhost";
      window.location.replace(url.toString());
      return false;
    }

    // Handle cancellation/popup blockers/COOP noise without throwing (callers should not redirect).
    if (isBenignPopupAuthError(code, message)) {
      console.log("Google sign-in cancelled/blocked", { code, message });
      return false;
    }

    const msg = message && message.trim().length > 0 ? message : "Google sign-in failed.";
    throw new AuthFlowError(msg, code);
  } finally {
    signinInFlight = false;
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch("/api/session/logout", { method: "POST", credentials: "include" });
  } catch {}
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
