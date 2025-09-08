"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onUser, signInWithGoogle, logout, initAnalytics } from "@/lib/firebase";
import { logEvent } from "firebase/analytics";
import type { User } from "firebase/auth";
import { OAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function Page() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // initialize analytics (no-op on unsupported envs) and log a page_view
    (async () => {
      try {
        const a = await initAnalytics();
        if (a) logEvent(a, "page_view");
      } catch {
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

  const handleGoogle = async () => {
    try {
      await signInWithGoogle();
      router.replace("/auth/complete");
    } catch {
      // ignored: signInWithGoogle filters benign errors
    }
  };

  const handleApple = async () => {
    try {
      const provider = new OAuthProvider("apple.com");
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      await fetch("/api/session/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idToken }),
        credentials: "include",
      });
      router.replace("/auth/complete");
    } catch {
      // noop; user may cancel
    }
  };

  return (
    <main className="mx-auto max-w-xl p-8 space-y-4">
      <h1 className="text-3xl font-serif">Sign in</h1>
      <div className="flex flex-col gap-3">
        <button className="px-4 py-2 border rounded" onClick={handleGoogle}>
          Continue with Google
        </button>
        {(process.env.NEXT_PUBLIC_ENABLE_APPLE ?? "false").toLowerCase() === "true" && (
          <button className="px-4 py-2 border rounded" onClick={handleApple}>
            Continue with Apple
          </button>
        )}
        <button className="px-4 py-2 border rounded" onClick={() => router.push("/auth/register") }>
          Continue with Email
        </button>
      </div>
    </main>
  );
}
