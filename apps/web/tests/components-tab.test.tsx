import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import ComponentsTab from "@/components/admin/design-system/ComponentsTab";

describe("ComponentsTab", () => {
  it("renders the component inventory and blank containers", () => {
    render(<ComponentsTab activeSubtab={null} />);

    expect(screen.getByText("UI Primitives")).toBeInTheDocument();
    expect(screen.getByText("Avatars")).toBeInTheDocument();
    expect(screen.getByText("Survey Cast Circles")).toBeInTheDocument();
    expect(screen.getByText("Social Handle Avatars")).toBeInTheDocument();
    expect(screen.getByText("Profile Hero Avatar")).toBeInTheDocument();
    expect(screen.getByText("components/survey/CastCircleToken.tsx + SingleSelectCastInput.tsx + CastMultiSelectInput.tsx + ReunionSeatingPredictionInput.tsx")).toBeInTheDocument();
    expect(screen.getByText("Button")).toBeInTheDocument();
    expect(screen.getByText("components/ui/button.tsx")).toBeInTheDocument();
    expect(screen.getAllByText("Blank Containers").length).toBeGreaterThan(0);
    expect(screen.getByText("Cards")).toBeInTheDocument();
    expect(screen.getByText("Toast / Notification Surfaces")).toBeInTheDocument();
  });

  it("filters to the selected subtab section", () => {
    render(<ComponentsTab activeSubtab="layout" />);

    expect(screen.getByText("Shells & Navigation")).toBeInTheDocument();
    expect(screen.getByText("AdminGlobalHeader")).toBeInTheDocument();
    expect(screen.queryByText("UI Primitives")).not.toBeInTheDocument();
    expect(screen.queryByText("Button")).not.toBeInTheDocument();
  });
});
