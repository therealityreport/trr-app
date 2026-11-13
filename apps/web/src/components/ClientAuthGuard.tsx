"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { getUserProfile } from "@/lib/db/users";
import { isProfileComplete } from "@/lib/validation/user";

interface ClientAuthGuardProps {
  children: React.ReactNode;
  requireComplete?: boolean;
}

export default function ClientAuthGuard({ children, requireComplete = false }: ClientAuthGuardProps) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState<{ uid: string; requireComplete: boolean } | null>(null);
  const [readErrorUid, setReadErrorUid] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let revision = 0;
    let redirectTimer: ReturnType<typeof setTimeout> | undefined;

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!active) return;
      const currentRevision = ++revision;
      clearTimeout(redirectTimer);
      setAuthorized(null);
      setReadErrorUid(null);
      if (!user) {
        redirectTimer = setTimeout(() => {
          if (active && revision === currentRevision && !auth.currentUser) router.replace("/");
        }, process.env.NODE_ENV === "production" ? 200 : 100);
        return;
      }

      const isActive = () => active && revision === currentRevision && auth.currentUser?.uid === user.uid;
      if (requireComplete) {
        let complete: boolean;
        try {
          complete = isProfileComplete(await getUserProfile(user.uid));
        } catch {
          if (isActive()) setReadErrorUid(user.uid);
          return;
        }
        if (!isActive()) return;
        if (!complete) {
          router.replace("/auth/finish");
          return;
        }
      }

      if (isActive()) setAuthorized({ uid: user.uid, requireComplete });
    });

    return () => {
      active = false;
      clearTimeout(redirectTimer);
      unsubscribe();
    };
  }, [router, requireComplete, attempt]);

  if (!authorized || authorized.uid !== auth.currentUser?.uid || authorized.requireComplete !== requireComplete) {
    const readFailed = requireComplete && readErrorUid !== null && readErrorUid === auth.currentUser?.uid;
    return (
      <main className="min-h-screen bg-zinc-50 px-6 py-16 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          {readFailed ? (
            <>
              <p role="alert" className="text-sm text-red-700 dark:text-red-300">Unable to load your profile.</p>
              <button type="button" className="mt-4 text-sm font-semibold underline" onClick={() => {
                setReadErrorUid(null);
                setAttempt((previous) => previous + 1);
              }}>Retry</button>
            </>
          ) : <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>}
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
