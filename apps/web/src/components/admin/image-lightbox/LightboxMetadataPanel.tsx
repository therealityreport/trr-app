"use client";

import type { ReactNode } from "react";

interface LightboxMetadataPanelProps {
  showMetadata: boolean;
  children: ReactNode;
}

export function LightboxMetadataPanel({ showMetadata, children }: LightboxMetadataPanelProps) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden border-t border-white/10 transition-all duration-300 ease-out md:border-t-0 md:border-l ${
        showMetadata ? "h-64 w-full md:h-auto md:w-80" : "h-0 w-full md:h-auto md:w-0"
      }`}
    >
      <div className={showMetadata ? "h-full w-full" : "pointer-events-none h-full w-full"}>
        {children}
      </div>
    </div>
  );
}
