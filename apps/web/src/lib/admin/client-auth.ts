"use client";

import type { User } from "firebase/auth";
import { isDevAdminBypassEnabledClient } from "@/lib/admin/dev-admin-bypass";
import { getOrCreateAdminFlowKey } from "@/lib/admin/operation-session";
import { getOrCreateAdminTabSessionId } from "@/lib/admin/tab-session";
import { auth } from "@/lib/firebase";

const DEFAULT_TOKEN_RETRY_DELAYS_MS = [150, 300, 600] as const;
const DEFAULT_ADMIN_AUTH_READY_TIMEOUT_MS = 2500;
const LOCALHOST_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const DEV_ADMIN_BYPASS_UID = "dev-admin-bypass";

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

async function waitForPreferredUserMatch(
  preferredUser: User | null | undefined,
  timeoutMs: number,
): Promise<void> {
  if (!preferredUser?.uid) return;
  if (isPreferredUserMatch(auth.currentUser, preferredUser)) return;

  await new Promise<void>((resolve) => {
    let settled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let unsubscribe = () => {};

    const finish = () => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      unsubscribe();
      resolve();
    };

    const handleUser = (currentUser: User | null) => {
      if (isPreferredUserMatch(currentUser, preferredUser)) {
        finish();
      }
    };

    timeoutId = setTimeout(finish, timeoutMs);

    try {
      const authWithTokenListener = auth as typeof auth & {
        onIdTokenChanged?: (nextOrObserver: (user: User | null) => void) => () => void;
      };
      if (typeof authWithTokenListener.onIdTokenChanged === "function") {
        unsubscribe = authWithTokenListener.onIdTokenChanged(handleUser);
      } else {
        unsubscribe = auth.onAuthStateChanged(handleUser);
      }
    } catch {
      finish();
    }
  });
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

function getTabSessionHeaderValue(): string | null {
  const sessionId = getOrCreateAdminTabSessionId();
  if (!sessionId || sessionId === "server" || sessionId === "unavailable") return null;
  return sessionId;
}

function isAdminRequestPath(pathname: string): boolean {
  return pathname.startsWith("/api/admin/");
}

function toRequestPath(input: RequestInfo | URL): string | null {
  if (input instanceof URL) {
    return `${input.pathname}${input.search}`;
  }
  const isRequest = typeof Request !== "undefined" && input instanceof Request;
  const raw = typeof input === "string" ? input : isRequest ? input.url : String(input);
  if (!raw) return null;
  try {
    const parsed = raw.startsWith("http://") || raw.startsWith("https://")
      ? new URL(raw)
      : new URL(raw, typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1");
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return raw.startsWith("/") ? raw : null;
  }
}

function toBodySignature(body: BodyInit | null | undefined): string {
  if (typeof body === "string") return String(body.length);
  if (body instanceof URLSearchParams) return String(body.toString().length);
  if (body == null) return "0";
  if (typeof FormData !== "undefined" && body instanceof FormData) return "form-data";
  if (typeof Blob !== "undefined" && body instanceof Blob) return `blob:${body.size}`;
  return String(String(body).length);
}

function resolveFlowKeyForRequest(input: RequestInfo | URL, init?: RequestInit): string | null {
  const path = toRequestPath(input);
  if (!path || !isAdminRequestPath(path)) return null;
  const isRequest = typeof Request !== "undefined" && input instanceof Request;
  const method = String(init?.method || (isRequest ? input.method : "GET") || "GET").toUpperCase();
  const body = init?.body ?? (isRequest ? input.body : undefined);
  const flowScope = `${method}:${path}:${toBodySignature(body)}`;
  const flowKey = getOrCreateAdminFlowKey(flowScope);
  return flowKey && flowKey.trim().length > 0 ? flowKey : null;
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

export type ClientAuthHeaders = {
  Authorization: string;
  "x-trr-tab-session-id"?: string;
};

export async function getClientAuthHeaders(
  options?: ClientAuthOptions,
): Promise<ClientAuthHeaders> {
  const tabSessionId = getTabSessionHeaderValue();
  const bypassAllowed =
    Boolean(options?.allowDevAdminBypass) &&
    (process.env.NODE_ENV !== "production" || isDevAdminBypassEnabledClient() || isClientLocalHostname());
  const preferredUserIsDevBypass = options?.preferredUser?.uid === DEV_ADMIN_BYPASS_UID;
  if (bypassAllowed && (!options?.preferredUser?.uid || preferredUserIsDevBypass)) {
    return {
      Authorization: "Bearer dev-admin-bypass",
      ...(tabSessionId ? { "x-trr-tab-session-id": tabSessionId } : {}),
    };
  }

  const retryDelaysMs =
    options?.tokenRetryDelaysMs && options.tokenRetryDelaysMs.length > 0
      ? options.tokenRetryDelaysMs
      : [...DEFAULT_TOKEN_RETRY_DELAYS_MS];

  const authReadyTimeoutMs = getAdminAuthReadyTimeoutMs();
  await waitForAuthStateReadyWithTimeout();
  await waitForPreferredUserMatch(options?.preferredUser, authReadyTimeoutMs);

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
          return {
            Authorization: `Bearer ${token}`,
            ...(tabSessionId ? { "x-trr-tab-session-id": tabSessionId } : {}),
          };
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
    return {
      Authorization: "Bearer dev-admin-bypass",
      ...(tabSessionId ? { "x-trr-tab-session-id": tabSessionId } : {}),
    };
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
    for (const [name, value] of Object.entries(authHeaders)) {
      headers.set(name, value);
    }
    if (!headers.has("x-trr-flow-key")) {
      const flowKey = resolveFlowKeyForRequest(input, init);
      if (flowKey) {
        headers.set("x-trr-flow-key", flowKey);
      }
    }
    return fetch(input, { ...init, headers });
  };

  let response = await execute(false);
  if (!retryOnAuthError) return response;
  if (response.status !== 401 && response.status !== 403) return response;

  response = await execute(true);
  return response;
}
