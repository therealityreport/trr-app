"use client";

import type { ReactNode } from "react";

export default function SeasonEpisodesTab({ children }: { children: ReactNode }) {
  return (
    <section
      id="season-tabpanel-episodes"
      role="tabpanel"
      aria-labelledby="season-tab-episodes"
    >
      {children}
    </section>
  );
}
