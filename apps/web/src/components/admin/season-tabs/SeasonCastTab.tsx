"use client";

import type { ReactNode } from "react";

export default function SeasonCastTab({ children }: { children: ReactNode }) {
  return (
    <section
      id="season-tabpanel-cast"
      role="tabpanel"
      aria-labelledby="season-tab-cast"
    >
      {children}
    </section>
  );
}
