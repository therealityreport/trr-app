import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import SurveyContinueButton from "@/components/survey/SurveyContinueButton";

describe("SurveyContinueButton", () => {
  it("keeps Figma proportions with responsive scaling defaults", () => {
    render(<SurveyContinueButton data-testid="continue-button" />);

    const button = screen.getByTestId("continue-button");
    expect(button).toHaveTextContent("Continue");
    expect(button).toHaveStyle({
      aspectRatio: "388.911 / 103.062",
      backgroundColor: "rgb(0, 0, 0)",
      color: "rgb(255, 255, 255)",
      fontFamily: '"Plymouth Serial", var(--font-sans), sans-serif',
    });
  });
});
