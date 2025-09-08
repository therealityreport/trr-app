"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onUser, signInWithGoogle, logout, initAnalytics } from "@/lib/firebase";
import type { User } from "firebase/auth";

export default function AuthPage() {
  const [user, setUser] = useState<User | null>(null);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    initAnalytics();
    return onUser((user) => {
      setUser(user);
      if (user) {
        router.replace("/hub");
      }
    });
  }, [router]);

  const handleGoogle = async () => {
    if (pending) return;
    setPending(true);
    setErr(null);
    try {
      await signInWithGoogle();
      router.replace("/auth/complete");
    } catch (err: unknown) {
      // Only “real” errors reach here (cancellations are ignored in the lib)
      const getMessage = (e: unknown): string => {
        if (typeof e === "string") return e;
        if (typeof e === "object" && e !== null) {
          const maybe = (e as { message?: unknown }).message;
          if (typeof maybe === "string") return maybe;
        }
        return "Sign-in failed.";
      };
      setErr(getMessage(err));
    } finally {
      setPending(false);
    }
  };

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
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button
        className="px-4 py-2 border rounded disabled:opacity-60"
        disabled={pending}
        onClick={handleGoogle}
      >
        {pending ? "Opening…" : "Continue with Google"}
      </button>
    </main>
  );
}
