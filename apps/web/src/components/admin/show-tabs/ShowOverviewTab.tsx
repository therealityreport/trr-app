"use client";

import type { ReactNode } from "react";

export default function ShowOverviewTab({ children }: { children: ReactNode }) {
  return (
    <section
      id="show-tabpanel-details"
      role="tabpanel"
      aria-labelledby="show-tab-details"
    >
      {children}
    </section>
  );
}
