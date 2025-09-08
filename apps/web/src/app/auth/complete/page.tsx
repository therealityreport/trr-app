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

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        // Fail fast: if no OAuth params and no session, bounce to register
        const hasOAuthParams = !!(search.get("code") || search.get("state") || search.get("oauth") || search.get("provider"));
        router.replace("/auth/register");
        return;
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
    return () => unsub();
  }, [router, search]);

  return (
    <main className="mx-auto max-w-xl p-12 text-center text-sm text-gray-600">
      Finishing sign-in…
    </main>
  );
}
