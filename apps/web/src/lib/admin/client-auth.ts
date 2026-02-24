"use client";

import type { User } from "firebase/auth";
import { isDevAdminBypassEnabledClient } from "@/lib/admin/dev-admin-bypass";
import { auth } from "@/lib/firebase";

const DEFAULT_TOKEN_RETRY_DELAYS_MS = [150, 300, 600] as const;
const DEFAULT_ADMIN_AUTH_READY_TIMEOUT_MS = 2500;
const LOCALHOST_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toHeaders(init?: HeadersInit): Headers {
  return init instanceof Headers ? new Headers(init) : new Headers(init ?? {});
}

function isPreferredUserMatch(currentUser: User | null, preferredUser: User | null | undefined): boolean {
  if (!preferredUser?.uid) return true;
  if (!currentUser?.uid) return false;
  return currentUser.uid === preferredUser.uid;
}

function getAdminAuthReadyTimeoutMs(): number {
  const rawTimeout = process.env.NEXT_PUBLIC_ADMIN_AUTH_READY_TIMEOUT_MS;
  if (!rawTimeout) return DEFAULT_ADMIN_AUTH_READY_TIMEOUT_MS;

  const parsed = Number.parseInt(rawTimeout, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_ADMIN_AUTH_READY_TIMEOUT_MS;
  }
  return parsed;
}

function isClientLocalHostname(): boolean {
  if (typeof window === "undefined") return false;
  const hostname = window.location.hostname.trim().toLowerCase();
  if (!hostname) return false;
  if (LOCALHOST_HOSTNAMES.has(hostname)) return true;
  return hostname.endsWith(".localhost");
}

async function waitForAuthStateReadyWithTimeout(): Promise<void> {
  if (typeof auth.authStateReady !== "function") return;

  const timeoutMs = getAdminAuthReadyTimeoutMs();
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const safeAuthReadyPromise = Promise.resolve()
    .then(() => auth.authStateReady?.())
    .catch(() => undefined);
  const timeoutPromise = new Promise<void>((resolve) => {
    timeoutId = setTimeout(resolve, timeoutMs);
  });

  await Promise.race([safeAuthReadyPromise, timeoutPromise]);
  if (timeoutId) {
    clearTimeout(timeoutId);
  }
}

export interface ClientAuthOptions {
  allowDevAdminBypass?: boolean;
  preferredUser?: User | null;
  tokenRetryDelaysMs?: number[];
  forceRefresh?: boolean;
  forceRefreshOnFinalAttempt?: boolean;
}

export async function getClientAuthHeaders(
  options?: ClientAuthOptions,
): Promise<{ Authorization: string }> {
  const bypassAllowed =
    Boolean(options?.allowDevAdminBypass) &&
    (process.env.NODE_ENV !== "production" || isDevAdminBypassEnabledClient() || isClientLocalHostname());
  if (bypassAllowed && !options?.preferredUser?.uid) {
    return { Authorization: "Bearer dev-admin-bypass" };
  }

  const retryDelaysMs =
    options?.tokenRetryDelaysMs && options.tokenRetryDelaysMs.length > 0
      ? options.tokenRetryDelaysMs
      : [...DEFAULT_TOKEN_RETRY_DELAYS_MS];

  await waitForAuthStateReadyWithTimeout();

  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
    const currentUser = auth.currentUser;
    const matchesPreferredUser = isPreferredUserMatch(currentUser, options?.preferredUser);

    if (matchesPreferredUser && currentUser) {
      const forceRefresh =
        Boolean(options?.forceRefresh) ||
        (attempt === retryDelaysMs.length && (options?.forceRefreshOnFinalAttempt ?? true));
      try {
        const token = await currentUser.getIdToken(forceRefresh);
        if (token) {
          return { Authorization: `Bearer ${token}` };
        }
      } catch {
        // Treat transient token read failures the same as a missing token and keep retrying.
      }
    }

    if (attempt < retryDelaysMs.length) {
      await sleep(retryDelaysMs[attempt] ?? DEFAULT_TOKEN_RETRY_DELAYS_MS[retryDelaysMs.length - 1] ?? 600);
      continue;
    }
  }

  if (bypassAllowed) {
    return { Authorization: "Bearer dev-admin-bypass" };
  }

  throw new Error("Not authenticated");
}

export interface FetchAdminWithAuthOptions extends ClientAuthOptions {
  retryOnAuthError?: boolean;
}

export async function fetchAdminWithAuth(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: FetchAdminWithAuthOptions,
): Promise<Response> {
  const retryOnAuthError = options?.retryOnAuthError ?? true;

  const execute = async (forceRefresh: boolean): Promise<Response> => {
    const authHeaders = await getClientAuthHeaders({
      ...options,
      forceRefresh,
      forceRefreshOnFinalAttempt: forceRefresh || options?.forceRefreshOnFinalAttempt,
    });
    const headers = toHeaders(init?.headers);
    headers.set("Authorization", authHeaders.Authorization);
    return fetch(input, { ...init, headers });
  };

  let response = await execute(false);
  if (!retryOnAuthError) return response;
  if (response.status !== 401 && response.status !== 403) return response;

  response = await execute(true);
  return response;
}
