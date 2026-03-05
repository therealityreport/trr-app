"use client";

const TAB_SESSION_STORAGE_KEY = "trr.admin.tab_session_id.v1";

const createSessionId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

export function getOrCreateAdminTabSessionId(): string {
  if (typeof window === "undefined") return "server";
  try {
    const existing = window.sessionStorage.getItem(TAB_SESSION_STORAGE_KEY);
    if (existing && existing.trim().length > 0) return existing;
    const created = createSessionId();
    window.sessionStorage.setItem(TAB_SESSION_STORAGE_KEY, created);
    return created;
  } catch {
    return "unavailable";
  }
}

export function applyAdminTabHeaders(headers: Headers): Headers {
  const sessionId = getOrCreateAdminTabSessionId();
  if (sessionId && sessionId !== "server" && sessionId !== "unavailable") {
    headers.set("x-trr-tab-session-id", sessionId);
  }
  return headers;
}
