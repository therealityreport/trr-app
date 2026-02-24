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

    const buttons = screen.getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual([
      "Overview",
      "Seasons",
      "Assets",
      "Settings",
    ]);

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
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

    expect(screen.getByRole("button", { name: "Social" }).className).toContain("bg-zinc-900");
    expect(screen.getByRole("button", { name: "Overview" }).className).toContain("bg-white");
  });
});
