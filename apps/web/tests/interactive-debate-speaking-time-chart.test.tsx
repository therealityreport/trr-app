import { render, screen } from "@testing-library/react";

import InteractiveDebateSpeakingTimeChart from "@/components/admin/design-docs/InteractiveDebateSpeakingTimeChart";

describe("InteractiveDebateSpeakingTimeChart", () => {
  it("renders the candidate portraits, axis labels, legend, and note styling hooks", () => {
    render(
      <InteractiveDebateSpeakingTimeChart
        title="How Long Each Candidate Spoke"
        note="Note: Each bar segment represents the approximate length of a candidate’s response to a question."
      />,
    );

    expect(
      screen.getByRole("heading", { level: 2, name: "How Long Each Candidate Spoke" }),
    ).toBeInTheDocument();
    expect(screen.getByAltText("Sanders portrait")).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        "Speaking time timeline for Sanders; total speaking time 15:28",
      ),
    ).toBeInTheDocument();
    const frame = screen.getByTestId("debate-speaking-time-chart-frame");
    expect(frame.querySelector("svg")).toHaveAttribute("viewBox", "0 0 1050 480");
    expect(frame.querySelector('[style*="overflow"]')).toBeNull();
    expect(screen.getByText("28 min.")).toBeInTheDocument();
    expect(screen.getByText("Electability")).toBeInTheDocument();
    expect(
      screen.getByText(/candidate’s response to a question/i),
    ).toHaveStyle({ color: "rgb(102, 102, 102)" });
  });
});
