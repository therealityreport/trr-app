import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { SeasonTabsNav } from "@/components/admin/season-tabs/SeasonTabsNav";

describe("SeasonTabsNav runtime", () => {
  it("renders season tabs in required order", () => {
    render(
      <SeasonTabsNav
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "episodes", label: "Seasons & Episodes" },
          { id: "assets", label: "Assets" },
          { id: "videos", label: "Videos" },
          { id: "fandom", label: "Fandom" },
          { id: "cast", label: "Cast" },
          { id: "surveys", label: "Surveys" },
          { id: "social", label: "Social Media" },
        ]}
        activeTab="overview"
        onSelect={() => {}}
      />
    );

    const labels = screen.getAllByRole("tab").map((node) => node.textContent);
    expect(labels).toEqual([
      "Overview",
      "Seasons & Episodes",
      "Assets",
      "Videos",
      "Fandom",
      "Cast",
      "Surveys",
      "Social Media",
    ]);
  });

  it("supports keyboard navigation", () => {
    const onSelect = vi.fn();
    render(
      <SeasonTabsNav
        tabs={[
          { id: "overview", label: "Overview" },
          { id: "episodes", label: "Seasons & Episodes" },
          { id: "assets", label: "Assets" },
        ]}
        activeTab="overview"
        onSelect={onSelect}
      />
    );

    fireEvent.keyDown(screen.getByRole("tab", { name: "Overview" }), { key: "ArrowRight" });
    expect(onSelect).toHaveBeenCalledWith("episodes");
    fireEvent.keyDown(screen.getByRole("tab", { name: "Overview" }), { key: "End" });
    expect(onSelect).toHaveBeenCalledWith("assets");
  });
});
