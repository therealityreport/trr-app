import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { ShowSeasonCards } from "@/components/admin/show-tabs/ShowSeasonCards";

describe("ShowSeasonCards runtime", () => {
  it("renders season cards with deep-link chips in requested order", () => {
    const onToggleSeason = vi.fn();

    render(
      <ShowSeasonCards
        seasons={[
          {
            id: "season-1",
            season_number: 1,
            overview: "Season one overview",
            air_date: "2024-01-01",
            tmdb_season_id: 10,
          },
        ]}
        seasonEpisodeSummaries={{
          "season-1": {
            count: 16,
            premiereDate: "2024-01-01",
            finaleDate: "2024-05-01",
          },
        }}
        openSeasonId={null}
        onToggleSeason={onToggleSeason}
        seasonPageTabs={[
          { tab: "overview", label: "Overview" },
          { tab: "episodes", label: "Seasons & Episodes" },
          { tab: "assets", label: "Assets" },
          { tab: "videos", label: "Videos" },
          { tab: "fandom", label: "Fandom" },
          { tab: "cast", label: "Cast" },
          { tab: "surveys", label: "Surveys" },
          { tab: "social", label: "Social Media" },
        ]}
        buildSeasonHref={(seasonNumber, tab) => `/admin/trr-shows/show/seasons/${seasonNumber}?tab=${tab}`}
        showTmdbId={12345}
        formatDateRange={(premiere, finale) => `${premiere ?? "-"}..${finale ?? "-"}`}
      />
    );

    expect(screen.getByRole("link", { name: "Season 1" })).toBeInTheDocument();
    expect(screen.getByText("16 episodes")).toBeInTheDocument();

    const chips = screen
      .getAllByRole("link")
      .filter((link) =>
        ["Overview", "Seasons & Episodes", "Assets", "Videos", "Fandom", "Cast", "Surveys", "Social Media"].includes(
          link.textContent ?? ""
        )
      );

    expect(chips.map((chip) => chip.textContent)).toEqual([
      "Overview",
      "Seasons & Episodes",
      "Assets",
      "Videos",
      "Fandom",
      "Cast",
      "Surveys",
      "Social Media",
    ]);

    fireEvent.click(screen.getByRole("button", { name: /Season 1/i }));
    expect(onToggleSeason).toHaveBeenCalledWith("season-1");
  });
});
