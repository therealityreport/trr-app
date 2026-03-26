import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import AdminIASection from "@/components/admin/design-docs/sections/AdminIASection";

describe("AdminIASection", () => {
  it("renders route matrices for admin-home, show, and season tabs", () => {
    render(<AdminIASection />);

    expect(screen.getByRole("heading", { name: "Admin Home Tools" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Show Page Tabs" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Season Page Tabs" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Redirectors and structurally wrong links" })).toBeInTheDocument();

    expect(screen.getAllByText("/[show]/assets/[subtab]").length).toBeGreaterThan(0);
    expect(screen.getAllByText("/[show]/social/[s#]/[w#]/[platform]").length).toBeGreaterThan(0);
    expect(screen.getAllByText("/[show]/s#/assets/[subtab]").length).toBeGreaterThan(0);
    expect(screen.getAllByText("/[show]/s#/social/[w#]/[platform]").length).toBeGreaterThan(0);
    expect(screen.getAllByText("/admin/social-media").length).toBeGreaterThan(0);
    expect(screen.getAllByText("/screenlaytics").length).toBeGreaterThan(0);
    expect(
      screen.getByText("Historical typo alias retained for compatibility; the canonical spelling remains /screenalytics."),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Wrong order").length).toBeGreaterThan(0);
  });
});
