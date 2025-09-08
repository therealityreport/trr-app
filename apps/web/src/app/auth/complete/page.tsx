"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase";
import { getUserProfile } from "@/lib/db/users";

export default function OAuthCallbackRedirect() {
  const router = useRouter();
  const search = useSearchParams();
  const ran = useRef(false); // neutralize StrictMode double invoke in dev
  const fallbackTimer = useRef<number | null>(null);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        // Fail fast: if no OAuth params and no session, bounce to register.
        // If OAuth params present, allow a short grace period for Firebase to hydrate.
        const hasOAuthParams = !!(search.get("code") || search.get("state") || search.get("oauth") || search.get("provider"));
        if (!hasOAuthParams) {
          router.replace("/auth/register");
        } else {
          if (fallbackTimer.current == null) {
            fallbackTimer.current = window.setTimeout(() => {
              router.replace("/auth/register");
            }, 8000);
          }
        }
        return;
      }
      // We have a user; cancel any fallback redirect timer
      if (fallbackTimer.current != null) {
        clearTimeout(fallbackTimer.current);
        fallbackTimer.current = null;
      }
      try {
        const idToken = await u.getIdToken();
        await fetch("/api/session/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ idToken }),
          credentials: "include",
        });
      } catch {}
      const profile = await getUserProfile(u.uid);
      const complete = !!profile && !!profile.username && Array.isArray(profile.shows) && profile.shows.length >= 3 && !!profile.birthday;
      router.replace(complete ? "/hub" : "/auth/finish");
    });
    return () => {
      if (fallbackTimer.current != null) clearTimeout(fallbackTimer.current);
      unsub();
    };
  }, [router, search]);

  return (
    <main className="mx-auto max-w-xl p-12 text-center text-sm text-gray-600">
      Finishing sign-in…
    </main>
  );
}
