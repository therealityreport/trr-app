"use client";

import { useCallback, useState } from "react";

type ToggleStarHandler = ((nextStarred: boolean) => Promise<void>) | undefined;

export function useLightboxManagementState(options: {
  onToggleStar: ToggleStarHandler;
  isStarred: boolean;
}) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [starLoading, setStarLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleAction = useCallback(
    async (action: string, handler?: () => Promise<void>) => {
      if (!handler || actionLoading) return;
      setActionLoading(action);
      setActionError(null);
      try {
        await handler();
      } catch (error) {
        setActionError(error instanceof Error ? error.message : "Action failed");
      } finally {
        setActionLoading(null);
      }
    },
    [actionLoading]
  );

  const handleToggleStar = useCallback(async () => {
    if (!options.onToggleStar || starLoading || actionLoading) return;
    setStarLoading(true);
    setActionError(null);
    try {
      await options.onToggleStar(!options.isStarred);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Failed to update star status");
    } finally {
      setStarLoading(false);
    }
  }, [actionLoading, options, starLoading]);

  return {
    actionLoading,
    starLoading,
    actionError,
    setActionError,
    handleAction,
    handleToggleStar,
  };
}
