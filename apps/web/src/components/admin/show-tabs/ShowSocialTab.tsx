"use client";

import type { ReactNode } from "react";

export default function ShowSocialTab({ children }: { children: ReactNode }) {
  return (
    <section
      id="show-tabpanel-social"
      role="tabpanel"
      aria-labelledby="show-tab-social"
    >
      {children}
    </section>
  );
}
