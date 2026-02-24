"use client";

import type { ReactNode } from "react";

export default function ShowSeasonsTab({ children }: { children: ReactNode }) {
  return (
    <section
      id="show-tabpanel-seasons"
      role="tabpanel"
      aria-labelledby="show-tab-seasons"
    >
      {children}
    </section>
  );
}
