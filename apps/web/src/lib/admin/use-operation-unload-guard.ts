"use client";

export const useAdminOperationUnloadGuard = (): void => {
  // Intentionally disabled. Browser-native beforeunload prompts were firing during
  // normal admin tab refresh/navigation and made workspace tab reuse unreliable.
};
