import { useCallback } from "react";
import type { Route } from "next";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

type UseTabRouteNavigationOptions<TTab extends string> = {
  router: AppRouterInstance;
  setActiveTab: (tab: TTab) => void;
  buildHref: (tab: TTab) => Route | null;
  beforeSelect?: (tab: TTab) => boolean;
};

export function useTabRouteNavigation<TTab extends string>({
  router,
  setActiveTab,
  buildHref,
  beforeSelect,
}: UseTabRouteNavigationOptions<TTab>) {
  return useCallback(
    (tab: TTab) => {
      if (beforeSelect && !beforeSelect(tab)) return;
      setActiveTab(tab);
      const href = buildHref(tab);
      if (!href) return;
      router.replace(href, { scroll: false });
    },
    [beforeSelect, buildHref, router, setActiveTab],
  );
}
