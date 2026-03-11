import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import IconsIllustrationsTab from "@/components/admin/design-system/IconsIllustrationsTab";

describe("IconsIllustrationsTab", () => {
  it("renders asset inventory groups and placeholders", () => {
    render(<IconsIllustrationsTab activeSubtab={null} />);

    expect(screen.getByText("Icons")).toBeInTheDocument();
    expect(screen.getAllByText("Checked-In Assets").length).toBeGreaterThan(0);
    expect(screen.getByText("Bravodle Icon")).toBeInTheDocument();
    expect(screen.getByText("Inline SVG / Component Icons")).toBeInTheDocument();
    expect(screen.getByText("SocialPlatformTabIcon")).toBeInTheDocument();
    expect(screen.getAllByText("Blank Containers").length).toBeGreaterThan(0);
    expect(screen.getByText("Empty-State Illustrations")).toBeInTheDocument();
  });

  it("filters to the selected subtab section", () => {
    render(<IconsIllustrationsTab activeSubtab="logos" />);

    expect(screen.getByText("Logos & Wordmarks")).toBeInTheDocument();
    expect(screen.getByText("FullName Wordmark")).toBeInTheDocument();
    expect(screen.queryByText("Icons")).not.toBeInTheDocument();
    expect(screen.queryByText("Bravodle Icon")).not.toBeInTheDocument();
  });
});
