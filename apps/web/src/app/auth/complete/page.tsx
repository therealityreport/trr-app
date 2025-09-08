"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { getUserProfile } from "@/lib/db/users";

export default function OAuthCallbackRedirect() {
  const router = useRouter();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) {
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
  }, [router]);

  return (
    <main className="mx-auto max-w-xl p-12 text-center text-sm text-gray-600">
      Finishing sign-in…
    </main>
  );
}
