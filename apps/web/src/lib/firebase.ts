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
    } catch {}
    try {
      connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    } catch {}
  }
}

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
    // Always open account chooser; ask for birthday scope (People API)
    provider.setCustomParameters({ prompt: "select_account" });
    provider.addScope("https://www.googleapis.com/auth/user.birthday.read");
    const result = await signInWithPopup(auth, provider);
    // Try to prefill birthday from Google People API (best-effort)
    try {
      const cred = GoogleAuthProvider.credentialFromResult(result);
      const accessToken = (cred as unknown as { accessToken?: string })?.accessToken;
      if (accessToken) {
        const resp = await fetch("https://people.googleapis.com/v1/people/me?personFields=birthdays", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (resp.ok) {
          const data = await resp.json();
          const bdays = Array.isArray(data?.birthdays) ? data.birthdays : [];
          const pick = bdays.find((b: any) => b?.date?.year) || bdays[0];
          const d = pick?.date;
          if (d && d.month && d.day) {
            const yyyy = d.year ? String(d.year).padStart(4, "0") : "";
            const mm = String(d.month).padStart(2, "0");
            const dd = String(d.day).padStart(2, "0");
            const iso = yyyy ? `${yyyy}-${mm}-${dd}` : "";
            if (iso) {
              try { sessionStorage.setItem("finish_birthday", iso); } catch {}
            }
          }
        }
      }
    } catch {}
    // Establish a server session cookie for SSR guards
    const idToken = await auth.currentUser?.getIdToken();
    if (idToken) {
      await fetch("/api/session/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken }),
        credentials: "include",
      }).catch(() => {});
    }
  } catch (err: unknown) {
    const code = typeof err === "object" && err !== null && "code" in err ? (err as { code?: unknown }).code : undefined;
    if (code !== "auth/cancelled-popup-request" && code !== "auth/popup-closed-by-user") {
      throw err;
    }
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
