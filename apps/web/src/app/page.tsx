"use client";

import { useEffect, useState } from "react";
import { onUser, signInWithGoogle, logout, initAnalytics } from "@/lib/firebase";
import { logEvent } from "firebase/analytics";
import type { User } from "firebase/auth";

export default function Page() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // initialize analytics (no-op on unsupported envs) and log a page_view
    (async () => {
      try {
  const a = await initAnalytics();
  if (a) logEvent(a, "page_view");
      } catch (e) {
        // ignore analytics init errors in unsupported environments
      }
    })();

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