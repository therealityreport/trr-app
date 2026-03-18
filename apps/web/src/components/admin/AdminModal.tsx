"use client";

import { useEffect, useId, useLayoutEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";

type AdminModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: ReactNode;
  ariaLabel?: string;
  closeLabel?: string;
  disableClose?: boolean;
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
  containerClassName?: string;
  backdropClassName?: string;
  panelClassName?: string;
  initialFocusRef?: RefObject<HTMLElement | null>;
  preserveScrollPosition?: boolean;
};

const FOCUSABLE_SELECTOR =
  'a[href], area[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const getFocusableElements = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (node) => !node.hasAttribute("disabled") && node.getAttribute("aria-hidden") !== "true"
  );

export default function AdminModal({
  isOpen,
  onClose,
  children,
  title,
  ariaLabel,
  closeLabel = "Close dialog",
  disableClose = false,
  closeOnEscape = true,
  closeOnBackdrop = true,
  containerClassName,
  backdropClassName,
  panelClassName,
  initialFocusRef,
  preserveScrollPosition = false,
}: AdminModalProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const panelScrollTopRef = useRef(0);
  const onCloseRef = useRef(onClose);
  const titleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useLayoutEffect(() => {
    if (!isOpen || !preserveScrollPosition) return;
    const panel = panelRef.current;
    if (!panel) return;
    panel.scrollTop = panelScrollTopRef.current;
  });

  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;
    if (!panel) return;

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusables = getFocusableElements(panel);
    const target = initialFocusRef?.current ?? focusables[0] ?? panel;
    target.focus();

    const handleScroll = () => {
      panelScrollTopRef.current = panel.scrollTop;
    };
    panel.addEventListener("scroll", handleScroll, { passive: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!disableClose && closeOnEscape) {
          event.preventDefault();
          onCloseRef.current();
        }
        return;
      }

      if (event.key !== "Tab") return;

      const orderedFocusables = getFocusableElements(panel);
      if (orderedFocusables.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const first = orderedFocusables[0];
      const last = orderedFocusables[orderedFocusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !panel.contains(active)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (active === last || !panel.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      panel.removeEventListener("scroll", handleScroll);
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocusedRef.current && previouslyFocusedRef.current.isConnected) {
        previouslyFocusedRef.current.focus();
      }
    };
  }, [closeOnEscape, disableClose, initialFocusRef, isOpen]);

  if (!isOpen) return null;

  const canBackdropClose = !disableClose && closeOnBackdrop;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${containerClassName ?? ""}`}>
      <button
        type="button"
        aria-label={closeLabel}
        className={`absolute inset-0 bg-black/40 ${backdropClassName ?? ""}`}
        onClick={canBackdropClose ? onClose : undefined}
        disabled={!canBackdropClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? undefined : ariaLabel}
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`relative w-full max-w-2xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl ${panelClassName ?? ""}`}
      >
        {title ? (
          <div className="mb-4">
            <h3 id={titleId} className="text-lg font-bold text-zinc-900">
              {title}
            </h3>
          </div>
        ) : null}
        {children}
      </div>
    </div>
  );
}
