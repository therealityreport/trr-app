"use client";

import type { ReactNode } from "react";

export default function SeasonAssetsTab({ children }: { children: ReactNode }) {
  return (
    <section
      id="season-tabpanel-assets"
      role="tabpanel"
      aria-labelledby="season-tab-assets"
    >
      {children}
    </section>
  );
}
