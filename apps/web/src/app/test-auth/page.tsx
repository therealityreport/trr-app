"use client";

import { useEffect, useState } from "react";
import { onUser, signInWithGoogle, logout, initAnalytics } from "@/lib/firebase";
import type { User } from "firebase/auth";

export default function AuthPage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    initAnalytics();
    return onUser(setUser);
  }, []);

  if (user) {
    return (
      <main className="mx-auto max-w-xl p-8 space-y-4">
        <h1 className="text-3xl font-serif">Signed in</h1>
        <p className="text-lg">Welcome, {user.displayName ?? user.email}</p>
        <button className="px-4 py-2 border rounded" onClick={() => logout()}>
          Sign out
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl p-8 space-y-4">
      <h1 className="text-3xl font-serif">Sign in</h1>
      <button className="px-4 py-2 border rounded" onClick={() => signInWithGoogle()}>
        Continue with Google
      </button>
    </main>
  );
}