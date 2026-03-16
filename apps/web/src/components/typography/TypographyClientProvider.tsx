"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type PropsWithChildren,
} from "react";
import {
  buildTypographyDataAttributes,
  resolveTypographyStyleForBreakpoint,
} from "@/lib/typography/runtime";
import type {
  TypographySelector,
  TypographyState,
  TypographyStyleInput,
} from "@/lib/typography/types";

const TypographyContext = createContext<TypographyState | null>(null);

export function TypographyClientProvider({
  state,
  children,
}: PropsWithChildren<{ state: TypographyState }>) {
  return (
    <TypographyContext.Provider value={state}>
      {children}
    </TypographyContext.Provider>
  );
}

export function useTypographyState() {
  return useContext(TypographyContext);
}

function useDesktopTypographyBreakpoint() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return undefined;
    }
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return isDesktop;
}

export function useTypographyRoleStyle(
  selector: TypographySelector,
  fallback?: TypographyStyleInput,
): CSSProperties | undefined {
  const state = useTypographyState();
  const isDesktop = useDesktopTypographyBreakpoint();

  return useMemo(() => {
    const resolved = resolveTypographyStyleForBreakpoint(
      state,
      selector,
      isDesktop ? "desktop" : "mobile",
      fallback,
    );
    if (!resolved) return undefined;
    return {
      fontFamily: resolved.fontFamily,
      fontSize: resolved.fontSize,
      fontWeight: resolved.fontWeight,
      lineHeight: resolved.lineHeight,
      letterSpacing: resolved.letterSpacing,
      ...(resolved.textTransform ? { textTransform: resolved.textTransform } : {}),
    } satisfies CSSProperties;
  }, [fallback, isDesktop, selector, state]);
}

export function useTypographyDataAttributes(selector: TypographySelector) {
  return useMemo(() => buildTypographyDataAttributes(selector), [selector]);
}
