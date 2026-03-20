import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ShowSocialTab from "@/components/admin/show-tabs/ShowSocialTab";

describe("ShowSocialTab runtime", () => {
  it("renders season controls for a selected season and dispatches callbacks", () => {
    const onSelectSocialSeasonId = vi.fn();

    render(
      <ShowSocialTab
        socialDependencyError={null}
        selectedSocialSeason={{ id: "s6", season_number: 6 }}
        socialSeasonOptions={[
          { id: "s5", season_number: 5 },
          { id: "s6", season_number: 6 },
        ]}
        selectedSocialSeasonId="s6"
        onSelectSocialSeasonId={onSelectSocialSeasonId}
        analyticsSection={<div>analytics section</div>}
        fallbackSection={<div>fallback section</div>}
      />
    );

    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
    expect(screen.getByText("Social Scope")).toBeInTheDocument();
    expect(screen.getByText("analytics section")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Season" })).toHaveValue("s6");

    fireEvent.change(screen.getByLabelText("Season"), { target: { value: "s5" } });
    expect(onSelectSocialSeasonId).toHaveBeenCalledWith("s5");
  });

  it("shows fallback content when no season is selected", () => {
    render(
      <ShowSocialTab
        socialDependencyError="missing dependency"
        selectedSocialSeason={null}
        socialSeasonOptions={[{ id: "s6", season_number: 6 }]}
        selectedSocialSeasonId={null}
        onSelectSocialSeasonId={() => {}}
        analyticsSection={<div>analytics section</div>}
        fallbackSection={<div>fallback section</div>}
      />
    );

    expect(screen.getByText(/Social dependency warning:/)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Social dependency warning");
    expect(screen.getByText("All Seasons")).toBeInTheDocument();
    expect(screen.getByText("fallback section")).toBeInTheDocument();
  });

  it("shows a static season label when only one season option exists", () => {
    render(
      <ShowSocialTab
        socialDependencyError={null}
        selectedSocialSeason={{ id: "s6", season_number: 6 }}
        socialSeasonOptions={[{ id: "s6", season_number: 6 }]}
        selectedSocialSeasonId="s6"
        onSelectSocialSeasonId={() => {}}
        analyticsSection={<div>analytics section</div>}
        fallbackSection={<div>fallback section</div>}
      />
    );

    expect(screen.getByText("Social Scope")).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Season" })).not.toBeInTheDocument();
    expect(screen.getByText("Season 6")).toBeInTheDocument();
    expect(screen.getByText("analytics section")).toBeInTheDocument();
  });
});
