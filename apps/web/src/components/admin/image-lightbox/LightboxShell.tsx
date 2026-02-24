"use client";

import type { ReactNode, RefObject } from "react";

interface LightboxShellProps {
  modalRef: RefObject<HTMLDivElement | null>;
  alt: string;
  onBackdropClick: () => void;
  children: ReactNode;
}

export function LightboxShell({ modalRef, alt, onBackdropClick, children }: LightboxShellProps) {
  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      {children}
    </div>
  );
}
