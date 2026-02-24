"use client";

import { useEffect, useRef, type RefObject } from "react";

const isInputElement = (element: EventTarget | null): boolean => {
  if (!element || !(element instanceof HTMLElement)) return false;
  const tagName = element.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    element.isContentEditable
  );
};

type UseLightboxKeyboardFocusArgs = {
  isOpen: boolean;
  modalRef: RefObject<HTMLDivElement | null>;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  triggerRef?: RefObject<HTMLElement | null>;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  onClose: () => void;
  metadataEnabled: boolean;
  onToggleMetadata?: () => void;
};

export function useLightboxKeyboardFocus({
  isOpen,
  modalRef,
  closeButtonRef,
  triggerRef,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  onClose,
  metadataEnabled,
  onToggleMetadata,
}: UseLightboxKeyboardFocusArgs) {
  const previousTriggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen && triggerRef?.current) {
      previousTriggerRef.current = triggerRef.current;
    }
  }, [isOpen, triggerRef]);

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
      return;
    }
    if (previousTriggerRef.current) {
      previousTriggerRef.current.focus();
      previousTriggerRef.current = null;
    }
  }, [closeButtonRef, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !modalRef.current) return;
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const focusable = Array.from(focusableElements);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
        return;
      }
      if (document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleTabKey);
    return () => document.removeEventListener("keydown", handleTabKey);
  }, [isOpen, modalRef]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isInputElement(event.target)) return;
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "ArrowLeft" && hasPrevious && onPrevious) {
        event.preventDefault();
        onPrevious();
        return;
      }
      if (event.key === "ArrowRight" && hasNext && onNext) {
        event.preventDefault();
        onNext();
        return;
      }
      if (event.key === "i" && metadataEnabled && onToggleMetadata) {
        onToggleMetadata();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    hasNext,
    hasPrevious,
    isOpen,
    metadataEnabled,
    onClose,
    onNext,
    onPrevious,
    onToggleMetadata,
  ]);
}
