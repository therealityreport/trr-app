"use client";

import type { ReactNode } from "react";
import SocialPlatformTabIcon from "@/components/admin/SocialPlatformTabIcon";
import type { PlatformTab } from "@/components/admin/season-social-analytics-section";

type SocialSeason = {
  id: string;
  season_number: number;
};

type SocialPlatformOption = {
  key: PlatformTab;
  label: string;
};

interface ShowSocialTabProps {
  socialDependencyError: string | null;
  selectedSocialSeason: SocialSeason | null;
  socialPlatformTab: PlatformTab;
  isRedditView?: boolean;
  onSelectSocialPlatformTab: (tab: PlatformTab) => void;
  socialPlatformOptions: ReadonlyArray<SocialPlatformOption>;
  socialSeasonOptions: SocialSeason[];
  selectedSocialSeasonId: string | null;
  onSelectSocialSeasonId: (seasonId: string | null) => void;
  analyticsSection: ReactNode;
  fallbackSection: ReactNode;
}

export default function ShowSocialTab({
  socialDependencyError,
  selectedSocialSeason,
  socialPlatformTab,
  isRedditView = false,
  onSelectSocialPlatformTab,
  socialPlatformOptions,
  socialSeasonOptions,
  selectedSocialSeasonId,
  onSelectSocialSeasonId,
  analyticsSection,
  fallbackSection,
}: ShowSocialTabProps) {
  return (
    <section
      id="show-tabpanel-social"
      role="tabpanel"
      aria-labelledby="show-tab-social"
    >
      <div className="space-y-4">
        {socialDependencyError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            Social dependency warning: {socialDependencyError}. Showing available social data.
          </div>
        )}
        {!isRedditView && (
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            {selectedSocialSeason ? (
              <nav className="mb-4 flex flex-wrap gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-2">
                {socialPlatformOptions.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => onSelectSocialPlatformTab(tab.key)}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                      socialPlatformTab === tab.key
                        ? "bg-white text-zinc-900 shadow-sm"
                        : "text-zinc-600 hover:bg-white/70 hover:text-zinc-800"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <SocialPlatformTabIcon tab={tab.key} />
                      <span>{tab.label}</span>
                    </span>
                  </button>
                ))}
              </nav>
            ) : (
              <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-600">
                Platform tabs are available after selecting a season.
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
                  Social Scope
                </p>
                <p className="text-sm text-zinc-600">
                  Defaulting to the most recent aired/airing season.
                </p>
              </div>
              {socialSeasonOptions.length > 1 ? (
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Season
                  <select
                    value={selectedSocialSeasonId ?? ""}
                    onChange={(event) => onSelectSocialSeasonId(event.target.value || null)}
                    className="mt-1 block min-w-[220px] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium normal-case tracking-normal text-zinc-700"
                  >
                    {socialSeasonOptions.map((season) => (
                      <option key={season.id} value={season.id}>
                        Season {season.season_number}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="text-sm font-semibold text-zinc-700">
                  {selectedSocialSeason ? `Season ${selectedSocialSeason.season_number}` : "All Seasons"}
                </p>
              )}
            </div>
          </div>
        )}
        {selectedSocialSeason ? analyticsSection : fallbackSection}
      </div>
    </section>
  );
}
