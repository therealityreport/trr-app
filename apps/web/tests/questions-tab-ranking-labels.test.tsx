import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/survey/QuestionRenderer", () => ({
  __esModule: true,
  default: () => <div data-testid="question-renderer-mock" />,
}));

vi.mock("@/components/flashback-ranker", () => ({
  __esModule: true,
  default: () => <div data-testid="flashback-ranker-mock" />,
}));

import QuestionsTab from "@/app/admin/fonts/_components/QuestionsTab";

describe("QuestionsTab ranking labels and paths", () => {
  it("shows spaced ranking names and canonical component paths", () => {
    render(<QuestionsTab baseColors={["#111111", "#FFFFFF"]} />);

    expect(screen.getByText("Person Rankings")).toBeInTheDocument();
    expect(screen.getByText("Poster Rankings")).toBeInTheDocument();
    expect(screen.getByText("components/survey/PersonRankingsInput.tsx")).toBeInTheDocument();
    expect(screen.getByText("components/survey/PosterRankingsInput.tsx")).toBeInTheDocument();
  });

  it("keeps figma ranking heading fonts in preview cards", () => {
    render(<QuestionsTab baseColors={["#111111", "#FFFFFF"]} />);

    const heading = screen.getAllByText("Rank the Cast of RHOSLC S6.")[0];
    const subheading = screen.getAllByText("Drag-and-Drop the Cast Members to their Rank.")[0];

    expect(heading).toHaveStyle({
      fontFamily: "\"Rude Slab Condensed\", var(--font-sans), sans-serif",
    });
    expect(subheading).toHaveStyle({
      fontFamily: "\"Plymouth Serial\", var(--font-sans), sans-serif",
    });
  });
});
