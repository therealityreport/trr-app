"use client";

import type { ReactNode } from "react";

export type SocialPlatformTabIconKey = "overview" | "instagram" | "tiktok" | "twitter" | "youtube";

const ICON_TONES: Record<SocialPlatformTabIconKey, string> = {
  overview: "border-zinc-300 bg-zinc-100 text-zinc-700",
  instagram: "border-pink-200 bg-pink-100 text-pink-700",
  tiktok: "border-zinc-800 bg-zinc-900 text-white",
  twitter: "border-sky-200 bg-sky-100 text-sky-700",
  youtube: "border-red-200 bg-red-100 text-red-700",
};

const renderIcon = (tab: SocialPlatformTabIconKey): ReactNode => {
  if (tab === "overview") {
    return (
      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
        <rect x="2.25" y="3" width="2.5" height="9.5" rx="0.75" />
        <rect x="6.75" y="6" width="2.5" height="6.5" rx="0.75" />
        <rect x="11.25" y="4.5" width="2.5" height="8" rx="0.75" />
      </svg>
    );
  }

  if (tab === "instagram") {
    return (
      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="2.25" y="2.25" width="11.5" height="11.5" rx="3.25" />
        <circle cx="8" cy="8" r="2.6" />
        <circle cx="11.8" cy="4.2" r="0.75" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (tab === "tiktok") {
    return (
      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden="true">
        <path d="M9.8 2.1v1.5c0 1 0.8 1.8 1.8 1.8h1.2v2h-1.2c-0.6 0-1.2-0.1-1.8-0.4v3.5a3.4 3.4 0 1 1-2.2-3.2V9a1.2 1.2 0 1 0 0.7 1.1V2.1h1.5Z" />
      </svg>
    );
  }

  if (tab === "twitter") {
    return (
      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M3 3l10 10" />
        <path d="M13 3L3 13" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor" aria-hidden="true">
      <rect x="1.75" y="3.25" width="12.5" height="9.5" rx="2.2" />
      <path d="M6.7 6.2v3.6l3.4-1.8-3.4-1.8Z" fill="white" />
    </svg>
  );
};

export default function SocialPlatformTabIcon({ tab }: { tab: SocialPlatformTabIconKey }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-4 w-4 items-center justify-center rounded-md border ${ICON_TONES[tab]}`}
    >
      {renderIcon(tab)}
    </span>
  );
}
