import React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import FontPairAudit from "@/components/admin/design-system/FontPairAudit";

describe("font pair audit", () => {
  it("renders artifact-driven weight tabs, inclusion reason, and sentence comparison", async () => {
    render(<FontPairAudit />);

    const audit = screen.getByTestId("font-pair-audit");
    expect(audit).toBeInTheDocument();
    expect(screen.getByText("Font pair audit")).toBeInTheDocument();
    expect(screen.getByText(/Computed glyph and kerning comparison/i)).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "400" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "700" })).toBeInTheDocument();
    expect(screen.getByText(/source 400 · active 400/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "700" }));
    expect(screen.getByText(/source 400 · active 700/i)).toBeInTheDocument();

    expect(screen.getByText(/metadata|current substitute/i)).toBeInTheDocument();
    expect(screen.getByText(/letter-spacing: 0\.000em/i)).toBeInTheDocument();
    expect(screen.getByText(/Sentence comparison:/i)).toBeInTheDocument();
    expect(screen.getByText("AV")).toBeInTheDocument();
    expect(screen.getAllByText("The Reality Report").length).toBeGreaterThan(0);
  });
});
