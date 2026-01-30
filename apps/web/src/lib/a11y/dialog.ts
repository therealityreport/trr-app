import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "button:not([disabled])",
  "iframe",
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(",");

function isVisible(element: HTMLElement): boolean {
  return Boolean(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
    if (!isVisible(element)) return false;
    if (element.getAttribute("aria-hidden") === "true") return false;
    return true;
  });
}

export function useDialogA11y<T extends HTMLElement>({
  open,
  onClose,
  initialFocusRef,
}: {
  open: boolean;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
}) {
  const dialogRef = useRef<T | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const previousBodyOverflowRef = useRef<string | null>(null);
  const wasOpenRef = useRef(open);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = open;

    if (open && !wasOpen) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
      previousBodyOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return;
    }

    if (!open && wasOpen) {
      document.body.style.overflow = previousBodyOverflowRef.current ?? "";
      previousBodyOverflowRef.current = null;

      const previous = previouslyFocusedRef.current;
      previouslyFocusedRef.current = null;
      if (previous && typeof previous.focus === "function") {
        requestAnimationFrame(() => previous.focus());
      }
    }
  }, [open]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!open) return;

    const focusTarget = initialFocusRef?.current ?? dialogRef.current;
    if (!focusTarget) return;

    const id = requestAnimationFrame(() => {
      try {
        focusTarget.focus();
      } catch {}
    });

    return () => cancelAnimationFrame(id);
  }, [open, initialFocusRef]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key !== "Tab") return;

    const container = dialogRef.current;
    if (!container || typeof document === "undefined") return;

    const focusable = getFocusableElements(container);
    if (focusable.length === 0) {
      event.preventDefault();
      container.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey) {
      if (!active || active === first || !container.contains(active)) {
        event.preventDefault();
        last.focus();
      }
      return;
    }

    if (active === last) {
      event.preventDefault();
      first.focus();
    }
  }, []);

  return { dialogRef, handleKeyDown };
}
