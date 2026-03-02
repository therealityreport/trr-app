import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import ShowSocialTab from "@/components/admin/show-tabs/ShowSocialTab";

describe("ShowSocialTab runtime", () => {
  it("renders platform controls for selected season and dispatches callbacks", () => {
    const onSelectSocialPlatformTab = vi.fn();
    const onSelectSocialSeasonId = vi.fn();

    render(
      <ShowSocialTab
        socialDependencyError={null}
        selectedSocialSeason={{ id: "s6", season_number: 6 }}
        socialPlatformTab="overview"
        onSelectSocialPlatformTab={onSelectSocialPlatformTab}
        socialPlatformOptions={[
          { key: "overview", label: "Overview" },
          { key: "instagram", label: "Instagram" },
        ]}
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
    expect(screen.getByRole("navigation", { name: "Social platform tabs" })).toBeInTheDocument();
    expect(screen.getByText("Social Scope")).toBeInTheDocument();
    expect(screen.getByText("analytics section")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Overview" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Instagram" }));
    expect(onSelectSocialPlatformTab).toHaveBeenCalledWith("instagram");

    fireEvent.change(screen.getByLabelText("Season"), { target: { value: "s5" } });
    expect(onSelectSocialSeasonId).toHaveBeenCalledWith("s5");
  });

  it("shows fallback content when no season is selected", () => {
    render(
      <ShowSocialTab
        socialDependencyError="missing dependency"
        selectedSocialSeason={null}
        socialPlatformTab="overview"
        onSelectSocialPlatformTab={() => {}}
        socialPlatformOptions={[{ key: "overview", label: "Overview" }]}
        socialSeasonOptions={[{ id: "s6", season_number: 6 }]}
        selectedSocialSeasonId={null}
        onSelectSocialSeasonId={() => {}}
        analyticsSection={<div>analytics section</div>}
        fallbackSection={<div>fallback section</div>}
      />
    );

    expect(screen.getByText(/Social dependency warning:/)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Social dependency warning");
    expect(screen.getByText("Platform tabs are available after selecting a season.")).toBeInTheDocument();
    expect(screen.getByText("fallback section")).toBeInTheDocument();
  });

  it("hides platform controls and social scope chrome in reddit mode", () => {
    render(
      <ShowSocialTab
        socialDependencyError={null}
        selectedSocialSeason={{ id: "s6", season_number: 6 }}
        socialPlatformTab="overview"
        isRedditView
        onSelectSocialPlatformTab={() => {}}
        socialPlatformOptions={[
          { key: "overview", label: "Overview" },
          { key: "instagram", label: "Instagram" },
        ]}
        socialSeasonOptions={[
          { id: "s5", season_number: 5 },
          { id: "s6", season_number: 6 },
        ]}
        selectedSocialSeasonId="s6"
        onSelectSocialSeasonId={() => {}}
        analyticsSection={<div>reddit analytics section</div>}
        fallbackSection={<div>fallback section</div>}
      />
    );

    expect(screen.queryByText("Social Scope")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Overview" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Instagram" })).not.toBeInTheDocument();
    expect(screen.getByText("reddit analytics section")).toBeInTheDocument();
  });
});
