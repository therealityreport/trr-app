"use client";

import type { ReactNode } from "react";

export default function ShowSettingsTab({ children }: { children: ReactNode }) {
  return (
    <section
      id="show-tabpanel-settings"
      role="tabpanel"
      aria-labelledby="show-tab-settings"
    >
      {children}
    </section>
  );
}
