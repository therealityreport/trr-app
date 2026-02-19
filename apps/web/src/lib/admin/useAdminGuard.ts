'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { isClientAdmin } from "./client-access";
import { isDevAdminBypassEnabledClient } from "./dev-admin-bypass";

const TRANSIENT_UNAUTH_GRACE_MS = 2500;

function buildUserKey(user: User | null): string | null {
  if (!user) return null;
  return `${user.uid}|${user.email ?? ""}|${user.displayName ?? ""}`;
}

export function useAdminGuard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userKey, setUserKey] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (isDevAdminBypassEnabledClient()) {
      const currentUser = auth.currentUser;
      setUser(currentUser);
      setUserKey(buildUserKey(currentUser) ?? "dev-admin-bypass");
      setHasAccess(true);
      setChecking(false);
      return;
    }

    let mounted = true;
    let authReady = false;
    let receivedAuthEmission = false;
    let lastUserKey: string | null = null;
    let lastHasAccess = false;
    let hasEvaluatedRedirect = false;
    let pendingUserKey: string | null = null;
    let pendingHasAccess = false;
    let hadAuthenticatedSession = false;
    let transientUnauthTimer: ReturnType<typeof setTimeout> | null = null;

    const clearTransientUnauthTimer = () => {
      if (!transientUnauthTimer) return;
      clearTimeout(transientUnauthTimer);
      transientUnauthTimer = null;
    };

    const finishCheckingIfReady = () => {
      if (!mounted) return;
      if (authReady && receivedAuthEmission) {
        setChecking(false);
      }
    };

    const evaluateInitialRedirect = () => {
      if (!mounted || !authReady || !receivedAuthEmission || hasEvaluatedRedirect) {
        return;
      }
      hasEvaluatedRedirect = true;
      if (!pendingUserKey) {
        router.replace("/");
      } else if (!pendingHasAccess) {
        router.replace("/hub");
      }
      lastHasAccess = pendingHasAccess;
    };

    const authStateReady = (auth as { authStateReady?: () => Promise<void> }).authStateReady;
    const authReadyPromise =
      typeof authStateReady === "function" ? authStateReady.call(auth) : Promise.resolve();
    void authReadyPromise.finally(() => {
      authReady = true;
      finishCheckingIfReady();
      evaluateInitialRedirect();
    });

    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      if (!mounted) return;

      receivedAuthEmission = true;
      const nextUserKey = buildUserKey(currentUser);
      const prevUserKey = lastUserKey;
      const nextHasAccess = Boolean(currentUser && isClientAdmin(currentUser));
      pendingUserKey = nextUserKey;
      pendingHasAccess = nextHasAccess;

      if (!currentUser && hadAuthenticatedSession && authReady) {
        setChecking(true);
        clearTransientUnauthTimer();
        transientUnauthTimer = setTimeout(() => {
          if (!mounted) return;
          if (buildUserKey(auth.currentUser)) return;
          lastUserKey = null;
          lastHasAccess = false;
          pendingUserKey = null;
          pendingHasAccess = false;
          setUser(null);
          setUserKey(null);
          setHasAccess(false);
          setChecking(false);
          router.replace("/");
        }, TRANSIENT_UNAUTH_GRACE_MS);
        return;
      }

      if (currentUser) {
        hadAuthenticatedSession = true;
        clearTransientUnauthTimer();
      }

      if (nextUserKey !== prevUserKey) {
        lastUserKey = nextUserKey;
        setUser(currentUser);
        setUserKey(nextUserKey);
      }

      setHasAccess((previous) => (previous === nextHasAccess ? previous : nextHasAccess));

      finishCheckingIfReady();
      if (!authReady) {
        return;
      }

      evaluateInitialRedirect();
      if (hasEvaluatedRedirect && lastHasAccess === nextHasAccess && nextUserKey === prevUserKey) {
        return;
      }

      const userChanged = nextUserKey !== prevUserKey;
      const accessChanged = nextHasAccess !== lastHasAccess;

      if (!nextUserKey && userChanged) {
        router.replace("/");
      } else if (nextUserKey && !nextHasAccess && (userChanged || accessChanged)) {
        router.replace("/hub");
      }

      lastHasAccess = nextHasAccess;
    });

    return () => {
      mounted = false;
      clearTransientUnauthTimer();
      unsubscribe();
    };
  }, [router]);

  return { user, userKey, checking, hasAccess };
}
