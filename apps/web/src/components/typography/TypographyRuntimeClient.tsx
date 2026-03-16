"use client";

import { TypographyClientProvider } from "@/components/typography/TypographyClientProvider";
import { buildSeededTypographyRuntimeState } from "@/lib/server/admin/typography-seed";
import { buildTypographyStylesheet } from "@/lib/typography/runtime";
import { TYPOGRAPHY_RUNTIME_INVALIDATE_EVENT } from "@/lib/typography/runtime-client";
import type { TypographyState } from "@/lib/typography/types";
import { useEffect, useMemo, useState, type PropsWithChildren } from "react";

const SEEDED_STATE = buildSeededTypographyRuntimeState();

async function loadTypographyState(signal: AbortSignal): Promise<TypographyState> {
  const response = await fetch("/api/design-system/typography", {
    method: "GET",
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to load typography runtime (${response.status})`);
  }
  return (await response.json()) as TypographyState;
}

export default function TypographyRuntimeClient({ children }: PropsWithChildren) {
  const [state, setState] = useState<TypographyState>(SEEDED_STATE);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const controller = new AbortController();
      try {
        const nextState = await loadTypographyState(controller.signal);
        if (!cancelled) {
          setState(nextState);
        }
      } catch {
        // Keep the seeded or previously-loaded runtime state when the fetch fails.
      } finally {
        controller.abort();
      }
    };

    void refresh();

    const handleInvalidate = () => {
      void refresh();
    };

    window.addEventListener(TYPOGRAPHY_RUNTIME_INVALIDATE_EVENT, handleInvalidate);
    return () => {
      cancelled = true;
      window.removeEventListener(TYPOGRAPHY_RUNTIME_INVALIDATE_EVENT, handleInvalidate);
    };
  }, []);

  const stylesheet = useMemo(() => buildTypographyStylesheet(state), [state]);

  return (
    <TypographyClientProvider state={state}>
      {stylesheet ? <style data-trr-typography-runtime>{stylesheet}</style> : null}
      {children}
    </TypographyClientProvider>
  );
}
