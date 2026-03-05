"use client";

import { useEffect, useRef } from "react";
import { hasTabOwnedActiveAdminOperationSessions } from "@/lib/admin/operation-session";
import { listTabOwnedActiveAdminRunSessions } from "@/lib/admin/run-session";

export const useAdminOperationUnloadGuard = (enabled = true): void => {
  const hasActiveWorkRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const refreshActiveState = () => {
      hasActiveWorkRef.current =
        hasTabOwnedActiveAdminOperationSessions() ||
        listTabOwnedActiveAdminRunSessions().length > 0;
    };

    refreshActiveState();
    const pollId = window.setInterval(refreshActiveState, 1250);
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasActiveWorkRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.clearInterval(pollId);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled]);
};
