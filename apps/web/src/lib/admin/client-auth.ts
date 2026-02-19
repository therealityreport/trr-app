"use client";

import type { User } from "firebase/auth";
import { isDevAdminBypassEnabledClient } from "@/lib/admin/dev-admin-bypass";
import { auth } from "@/lib/firebase";

const DEFAULT_TOKEN_RETRY_DELAYS_MS = [150, 300, 600] as const;

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
  const retryDelaysMs =
    options?.tokenRetryDelaysMs && options.tokenRetryDelaysMs.length > 0
      ? options.tokenRetryDelaysMs
      : [...DEFAULT_TOKEN_RETRY_DELAYS_MS];

  if (typeof auth.authStateReady === "function") {
    await auth.authStateReady();
  }

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

  if (options?.allowDevAdminBypass && isDevAdminBypassEnabledClient()) {
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
