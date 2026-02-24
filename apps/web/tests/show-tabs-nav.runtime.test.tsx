import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { ShowTabsNav } from "@/components/admin/show-tabs/ShowTabsNav";

describe("ShowTabsNav runtime", () => {
  it("renders tabs in order and dispatches selection", () => {
    const onSelect = vi.fn();
    render(
      <ShowTabsNav
        tabs={[
          { id: "details", label: "Overview" },
          { id: "seasons", label: "Seasons" },
          { id: "assets", label: "Assets" },
          { id: "settings", label: "Settings" },
        ]}
        activeTab="details"
        onSelect={onSelect}
      />
    );

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      "Overview",
      "Seasons",
      "Assets",
      "Settings",
    ]);
    expect(screen.getByRole("tablist", { name: "Show tabs" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute("aria-selected", "true");

    fireEvent.click(screen.getByRole("tab", { name: "Settings" }));
    expect(onSelect).toHaveBeenCalledWith("settings");
  });

  it("marks only the active tab as selected style", () => {
    render(
      <ShowTabsNav
        tabs={[
          { id: "details", label: "Overview" },
          { id: "social", label: "Social" },
        ]}
        activeTab="social"
        onSelect={() => {}}
      />
    );

    expect(screen.getByRole("tab", { name: "Social" }).className).toContain("bg-zinc-900");
    expect(screen.getByRole("tab", { name: "Overview" }).className).toContain("bg-white");
  });

  it("supports keyboard tab navigation", () => {
    const onSelect = vi.fn();
    render(
      <ShowTabsNav
        tabs={[
          { id: "details", label: "Overview" },
          { id: "seasons", label: "Seasons" },
          { id: "assets", label: "Assets" },
          { id: "news", label: "News" },
        ]}
        activeTab="details"
        onSelect={onSelect}
      />
    );

    fireEvent.keyDown(screen.getByRole("tab", { name: "Overview" }), { key: "ArrowRight" });
    expect(onSelect).toHaveBeenCalledWith("seasons");

    fireEvent.keyDown(screen.getByRole("tab", { name: "Overview" }), { key: "End" });
    expect(onSelect).toHaveBeenCalledWith("news");
  });
});
