'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { checkServerAdminAccess } from "./client-access";
import { isDevAdminBypassEnabledClient, isLocalDevHostname } from "./dev-admin-bypass";

const TRANSIENT_UNAUTH_GRACE_MS = 2500;
const DEFAULT_ADMIN_AUTH_READY_TIMEOUT_MS = 2500;

function buildUserKey(user: User | null): string | null {
  if (!user) return null;
  return `${user.uid}|${user.email ?? ""}|${user.displayName ?? ""}`;
}

const DEV_ADMIN_BYPASS_USER = {
  uid: "dev-admin-bypass",
  email: "codex@thereality.report",
  displayName: "Codex Admin Bypass",
} as User;

function getAdminAuthReadyTimeoutMs(): number {
  const rawTimeout = process.env.NEXT_PUBLIC_ADMIN_AUTH_READY_TIMEOUT_MS;
  if (!rawTimeout) return DEFAULT_ADMIN_AUTH_READY_TIMEOUT_MS;

  const parsed = Number.parseInt(rawTimeout, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_ADMIN_AUTH_READY_TIMEOUT_MS;
  }
  return parsed;
}

export function useAdminGuard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userKey, setUserKey] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const shouldUseLocalBypass =
      isDevAdminBypassEnabledClient() ||
      (typeof window !== "undefined" && isLocalDevHostname(window.location.hostname));

    if (shouldUseLocalBypass) {
      let mounted = true;
      let authReadyFallbackTimer: ReturnType<typeof setTimeout> | null = null;
      const getCurrentUserSafely = () => {
        try {
          return auth.currentUser;
        } catch {
          return null;
        }
      };

      const clearAuthReadyFallbackTimer = () => {
        if (!authReadyFallbackTimer) return;
        clearTimeout(authReadyFallbackTimer);
        authReadyFallbackTimer = null;
      };

      const applyBypassState = (currentUser: User | null) => {
        if (!mounted) return;
        setUser(currentUser ?? DEV_ADMIN_BYPASS_USER);
        setUserKey(buildUserKey(currentUser) ?? "dev-admin-bypass");
        setHasAccess(true);
        setChecking(false);
      };

      const markBypassReady = () => {
        clearAuthReadyFallbackTimer();
        applyBypassState(getCurrentUserSafely());
      };

      applyBypassState(getCurrentUserSafely());
      authReadyFallbackTimer = setTimeout(markBypassReady, getAdminAuthReadyTimeoutMs());

      const authStateReady = (auth as { authStateReady?: () => Promise<void> }).authStateReady;
      const authReadyPromise =
        typeof authStateReady === "function"
          ? Promise.resolve(authStateReady.call(auth)).catch(() => undefined)
          : Promise.resolve();
      void authReadyPromise.finally(markBypassReady);

      let unsubscribe = () => {};
      try {
        unsubscribe = auth.onAuthStateChanged((currentUser) => {
          applyBypassState(currentUser);
        });
      } catch {
        applyBypassState(getCurrentUserSafely());
      }

      return () => {
        mounted = false;
        clearAuthReadyFallbackTimer();
        unsubscribe();
      };
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
    let authReadyFallbackTimer: ReturnType<typeof setTimeout> | null = null;
    let accessCheckId = 0;
    let accessCheckPending = false;

    const clearTransientUnauthTimer = () => {
      if (!transientUnauthTimer) return;
      clearTimeout(transientUnauthTimer);
      transientUnauthTimer = null;
    };

    const clearAuthReadyFallbackTimer = () => {
      if (!authReadyFallbackTimer) return;
      clearTimeout(authReadyFallbackTimer);
      authReadyFallbackTimer = null;
    };

    const finishCheckingIfReady = () => {
      if (!mounted) return;
      if (receivedAuthEmission && !accessCheckPending) {
        setChecking(false);
      }
    };

    const evaluateInitialRedirect = () => {
      if (!mounted || !authReady || !receivedAuthEmission || accessCheckPending || hasEvaluatedRedirect) {
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

    const applyResolvedAccess = (
      nextUserKey: string | null,
      prevUserKey: string | null,
      nextHasAccess: boolean,
    ) => {
      if (!mounted) return;
      pendingHasAccess = nextHasAccess;
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
    };

    const handleAuthUser = (currentUser: User | null) => {
      if (!mounted) return;

      receivedAuthEmission = true;
      const nextUserKey = buildUserKey(currentUser);
      const prevUserKey = lastUserKey;
      pendingUserKey = nextUserKey;

      if (!currentUser) {
        accessCheckId += 1;
        accessCheckPending = false;
        pendingHasAccess = false;

        if (hadAuthenticatedSession && authReady) {
          clearTransientUnauthTimer();
          transientUnauthTimer = setTimeout(() => {
            if (!mounted) return;
            if (buildUserKey(auth.currentUser)) return;
            accessCheckId += 1;
            accessCheckPending = false;
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

        if (nextUserKey !== prevUserKey) {
          lastUserKey = nextUserKey;
          setUser(null);
          setUserKey(null);
        }
        applyResolvedAccess(nextUserKey, prevUserKey, false);
        return;
      }

      hadAuthenticatedSession = true;
      clearTransientUnauthTimer();

      if (nextUserKey !== prevUserKey) {
        lastUserKey = nextUserKey;
        setUser(currentUser);
        setUserKey(nextUserKey);
      }

      const currentAccessCheckId = accessCheckId + 1;
      accessCheckId = currentAccessCheckId;
      accessCheckPending = true;
      pendingHasAccess = false;
      setChecking(true);

      void checkServerAdminAccess(currentUser).then((nextHasAccess) => {
        if (!mounted || accessCheckId !== currentAccessCheckId || pendingUserKey !== nextUserKey) {
          return;
        }
        accessCheckPending = false;
        applyResolvedAccess(nextUserKey, prevUserKey, nextHasAccess);
      });
    };

    const markAuthReady = () => {
      if (authReady) return;
      authReady = true;
      clearAuthReadyFallbackTimer();
      if (!receivedAuthEmission) {
        handleAuthUser(auth.currentUser);
      }
      finishCheckingIfReady();
      evaluateInitialRedirect();
    };

    authReadyFallbackTimer = setTimeout(markAuthReady, getAdminAuthReadyTimeoutMs());
    const authStateReady = (auth as { authStateReady?: () => Promise<void> }).authStateReady;
    const authReadyPromise =
      typeof authStateReady === "function"
        ? Promise.resolve(authStateReady.call(auth)).catch(() => undefined)
        : Promise.resolve();
    void authReadyPromise.finally(markAuthReady);

    const unsubscribe = auth.onAuthStateChanged(handleAuthUser);

    return () => {
      mounted = false;
      clearTransientUnauthTimer();
      clearAuthReadyFallbackTimer();
      unsubscribe();
    };
  }, [router]);

  return { user, userKey, checking, hasAccess };
}
