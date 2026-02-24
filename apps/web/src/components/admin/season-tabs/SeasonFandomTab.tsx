"use client";

import type { ReactNode } from "react";

export default function SeasonFandomTab({ children }: { children: ReactNode }) {
  return (
    <section
      id="season-tabpanel-fandom"
      role="tabpanel"
      aria-labelledby="season-tab-fandom"
    >
      {children}
    </section>
  );
}
