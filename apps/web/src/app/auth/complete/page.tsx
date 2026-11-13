"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase";
import { getUserProfile } from "@/lib/db/users";
import { isProfileComplete } from "@/lib/validation/user";

function OAuthCallbackRedirectContent() {
  const router = useRouter();
  const search = useSearchParams();
  const hasOAuthParams = Boolean(search.get("code") || search.get("state") || search.get("oauth") || search.get("provider"));
  const showWelcome = search.get("welcome") === "1";
  const [attempt, setAttempt] = useState(0);
  const [readErrorUid, setReadErrorUid] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let revision = 0;
    const redirectWithoutUser = () => {
      if (active && !auth.currentUser) router.replace("/auth/register");
    };
    let timer = window.setTimeout(redirectWithoutUser, hasOAuthParams ? 8000 : 2000);
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!active) return;
      const currentRevision = ++revision;
      window.clearTimeout(timer);
      setReadErrorUid(null);
      if (!user) {
        if (hasOAuthParams) timer = window.setTimeout(redirectWithoutUser, 8000);
        else redirectWithoutUser();
        return;
      }

      const isActive = () => active && currentRevision === revision && auth.currentUser?.uid === user.uid;
      let complete: boolean;
      try {
        complete = isProfileComplete(await getUserProfile(user.uid));
      } catch {
        if (isActive()) setReadErrorUid(user.uid);
        return;
      }
      if (!isActive()) return;
      if (complete && showWelcome) {
        try { sessionStorage.setItem("toastMessage", "Welcome back!"); } catch {}
      }
      router.replace(complete ? "/hub" : "/auth/finish");
    });

    return () => {
      active = false;
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, [router, hasOAuthParams, showWelcome, attempt]);

  const readFailed = readErrorUid !== null && readErrorUid === auth.currentUser?.uid;

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 dark:bg-black flex items-center justify-center">
      <div className="mx-auto max-w-md w-full text-center">
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-8">
          {readFailed ? (
            <>
              <p role="alert" className="text-sm text-red-700 dark:text-red-300">
                Unable to load your profile. Try again to finish signing in.
              </p>
              <button className="mt-4 text-sm font-semibold underline" type="button" onClick={() => {
                setReadErrorUid(null);
                setAttempt((previous) => previous + 1);
              }}>
                Retry
              </button>
            </>
          ) : (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-100 mx-auto mb-4"></div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Finishing sign-in…</p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function OAuthCallbackRedirect() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-zinc-50 px-6 py-16 dark:bg-black flex items-center justify-center">
        <div className="mx-auto max-w-md w-full text-center">
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-100 mx-auto mb-4"></div>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Loading…
            </p>
          </div>
        </div>
      </main>
    }>
      <OAuthCallbackRedirectContent />
    </Suspense>
  );
}
