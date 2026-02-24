"use client";

import type { ReactNode } from "react";

export default function SeasonSocialTab({ children }: { children: ReactNode }) {
  return (
    <section
      id="season-tabpanel-social"
      role="tabpanel"
      aria-labelledby="season-tab-social"
    >
      {children}
    </section>
  );
}
