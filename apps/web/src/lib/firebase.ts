import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAuth, GoogleAuthProvider, onAuthStateChanged,
  signInWithPopup, signOut, type User
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

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export function onUser(cb: (u: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(auth, provider);
}

export async function logout() {
  await signOut(auth);
}

let analyticsInstance: Analytics | null = null;
export async function initAnalytics() {
  if (!analyticsInstance && (await isSupported())) {
    analyticsInstance = getAnalytics(app);
  }
  return analyticsInstance;
}