"use client";

import type { ReactNode } from "react";

export default function SeasonVideosTab({ children }: { children: ReactNode }) {
  return (
    <section
      id="season-tabpanel-videos"
      role="tabpanel"
      aria-labelledby="season-tab-videos"
    >
      {children}
    </section>
  );
}
