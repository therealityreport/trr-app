import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import SeasonSocialTab from "@/components/admin/season-tabs/SeasonSocialTab";

describe("SeasonSocialTab runtime", () => {
  it("renders warning and analytics section content", () => {
    render(
      <SeasonSocialTab
        seasonSupplementalWarning="season metadata stale"
        analyticsSection={<div>analytics section</div>}
      />
    );

    expect(screen.getByRole("tabpanel")).toBeInTheDocument();
    expect(screen.getByText(/Season supplemental data warning:/)).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Season supplemental data warning");
    expect(screen.getByText("analytics section")).toBeInTheDocument();
  });
});
