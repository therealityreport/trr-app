"use client";

import type { ReactNode } from "react";

export default function ShowNewsTab({ children }: { children: ReactNode }) {
  return (
    <section
      id="show-tabpanel-news"
      role="tabpanel"
      aria-labelledby="show-tab-news"
    >
      {children}
    </section>
  );
}
