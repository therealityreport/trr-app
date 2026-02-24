"use client";

import type { ReactNode } from "react";

export default function ShowAssetsTab({ children }: { children: ReactNode }) {
  return (
    <section
      id="show-tabpanel-assets"
      role="tabpanel"
      aria-labelledby="show-tab-assets"
    >
      {children}
    </section>
  );
}
