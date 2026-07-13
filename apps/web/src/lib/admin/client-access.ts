import type { User } from "firebase/auth";

type AdminCheckResponse = {
  hasAccess?: unknown;
};

export type ServerAdminAccessResult = "allowed" | "denied" | "unavailable";

const ADMIN_CHECK_TIMEOUT_MS = 5000;

export function isClientAdmin(user: User | null): boolean {
  void user;
  return false;
}

export async function checkServerAdminAccess(user: User | null): Promise<ServerAdminAccessResult> {
  if (!user) return "denied";

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), ADMIN_CHECK_TIMEOUT_MS);
  const abortPromise = new Promise<never>((_, reject) => {
    abortController.signal.addEventListener(
      "abort",
      () => reject(new DOMException("Admin access check timed out", "AbortError")),
      { once: true },
    );
  });

  let token: string | null = null;
  try {
    token = await Promise.race([user.getIdToken(), abortPromise]);
  } catch {
    if (abortController.signal.aborted) {
      clearTimeout(timeoutId);
      return "unavailable";
    }
    token = null;
  }

  const headers = new Headers({ accept: "application/json" });
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  try {
    const response = await Promise.race([
      fetch("/api/admin/check", {
        method: "GET",
        headers,
        credentials: "same-origin",
        cache: "no-store",
        signal: abortController.signal,
      }),
      abortPromise,
    ]);
    if (!response.ok) return "unavailable";
    let payload: AdminCheckResponse;
    try {
      payload = (await Promise.race([response.json(), abortPromise])) as AdminCheckResponse;
    } catch {
      return "unavailable";
    }
    if (payload.hasAccess === true) return "allowed";
    if (payload.hasAccess === false) return "denied";
    return "unavailable";
  } catch {
    return "unavailable";
  } finally {
    clearTimeout(timeoutId);
  }
}

export function getAllowedAdminEmails(): string[] {
  return [];
}

export function getAllowedAdminUids(): string[] {
  return [];
}
