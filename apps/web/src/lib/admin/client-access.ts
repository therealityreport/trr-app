import type { User } from "firebase/auth";

type AdminCheckResponse = {
  hasAccess?: unknown;
};

const ADMIN_CHECK_TIMEOUT_MS = 5000;

export function isClientAdmin(user: User | null): boolean {
  void user;
  return false;
}

export async function checkServerAdminAccess(user: User | null): Promise<boolean> {
  if (!user) return false;

  let token: string | null = null;
  try {
    token = await user.getIdToken();
  } catch {
    token = null;
  }

  const headers = new Headers({ accept: "application/json" });
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  const abortController = new AbortController();
  const timeoutId = window.setTimeout(() => abortController.abort(), ADMIN_CHECK_TIMEOUT_MS);
  try {
    const response = await fetch("/api/admin/check", {
      method: "GET",
      headers,
      credentials: "same-origin",
      cache: "no-store",
      signal: abortController.signal,
    });
    if (!response.ok) return false;
    const payload = (await response.json()) as AdminCheckResponse;
    return payload.hasAccess === true;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function getAllowedAdminEmails(): string[] {
  return [];
}

export function getAllowedAdminUids(): string[] {
  return [];
}
