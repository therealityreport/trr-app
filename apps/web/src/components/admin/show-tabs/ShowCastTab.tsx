"use client";

import type { ReactNode } from "react";

export default function ShowCastTab({ children }: { children: ReactNode }) {
  return (
    <section
      id="show-tabpanel-cast"
      role="tabpanel"
      aria-labelledby="show-tab-cast"
    >
      {children}
    </section>
  );
}
