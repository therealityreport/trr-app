"use client";

export const TYPOGRAPHY_RUNTIME_INVALIDATE_EVENT = "trr:typography-runtime-invalidate";

export function notifyTypographyRuntimeRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(TYPOGRAPHY_RUNTIME_INVALIDATE_EVENT));
}
