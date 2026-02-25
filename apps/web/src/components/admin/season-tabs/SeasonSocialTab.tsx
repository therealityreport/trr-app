"use client";

import type { ReactNode } from "react";

interface SeasonSocialTabProps {
  seasonSupplementalWarning: string | null;
  analyticsSection: ReactNode;
}

export default function SeasonSocialTab({
  seasonSupplementalWarning,
  analyticsSection,
}: SeasonSocialTabProps) {
  return (
    <section
      id="season-tabpanel-social"
      role="tabpanel"
      aria-labelledby="season-tab-social"
    >
      <div className="space-y-3">
        {seasonSupplementalWarning && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            Season supplemental data warning: {seasonSupplementalWarning}. Social analytics remains available.
          </div>
        )}
        {analyticsSection}
      </div>
    </section>
  );
}
